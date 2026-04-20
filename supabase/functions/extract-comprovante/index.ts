// Extrai dados de comprovantes de pagamento (PDF) usando Lovable AI Gateway
// Retorna: data_pagamento, valor, destinatario_nome, destinatario_documento, tipo

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMPRESA_CNPJ = '02139487000113'; // 02.139.487/0001-13 - Leandro Garcia Feliciano (7Estrivos)
const EMPRESA_NOMES = ['leandro garcia feliciano', '7estrivos', 'sete estrivos'];

function normalizeDoc(s: string): string {
  return (s || '').replace(/\D/g, '');
}

function normalizeText(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY não configurada' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { pdfBase64, fileName } = await req.json();
    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: 'pdfBase64 obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Você analisa comprovantes de pagamento (PIX, TED, DOC, boleto) brasileiros em PDF.
Extraia EXATAMENTE estes dados e retorne via tool call:
- data_pagamento: data efetiva da transferência (formato YYYY-MM-DD)
- valor: valor pago em reais (número, sem R$ nem separador de milhar; use ponto decimal)
- destinatario_nome: nome completo de quem RECEBEU o pagamento
- destinatario_documento: CPF ou CNPJ de quem RECEBEU (apenas dígitos, sem máscara)
- descricao: breve descrição se disponível (ex: "PIX enviado", "TED")

Se algum campo não estiver claro no comprovante, retorne string vazia ou 0 para valor.
NUNCA invente dados.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Extraia os dados deste comprovante (arquivo: ${fileName || 'comprovante.pdf'}).` },
              { type: 'file', file: { filename: fileName || 'comprovante.pdf', file_data: `data:application/pdf;base64,${pdfBase64}` } },
            ],
          },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'registrar_comprovante',
            description: 'Registra os dados extraídos do comprovante.',
            parameters: {
              type: 'object',
              properties: {
                data_pagamento: { type: 'string', description: 'Data no formato YYYY-MM-DD' },
                valor: { type: 'number', description: 'Valor em reais' },
                destinatario_nome: { type: 'string' },
                destinatario_documento: { type: 'string', description: 'Apenas dígitos' },
                descricao: { type: 'string' },
              },
              required: ['data_pagamento', 'valor', 'destinatario_nome', 'destinatario_documento'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'registrar_comprovante' } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições atingido. Tente em alguns minutos.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA esgotados. Adicione créditos em Settings > Workspace > Usage.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Falha na extração via IA' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: 'IA não retornou dados estruturados' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const extracted = JSON.parse(toolCall.function.arguments);
    const docDigits = normalizeDoc(extracted.destinatario_documento || '');
    const nomeNorm = normalizeText(extracted.destinatario_nome || '');

    let tipo: 'empresa' | 'fornecedor' = 'fornecedor';
    let destinatario = extracted.destinatario_nome || '';

    const isEmpresa =
      docDigits === EMPRESA_CNPJ ||
      EMPRESA_NOMES.some((n) => nomeNorm.includes(n));

    if (isEmpresa) {
      tipo = 'empresa';
      destinatario = 'Empresa';
    }

    return new Response(JSON.stringify({
      data_pagamento: extracted.data_pagamento || '',
      valor: Number(extracted.valor) || 0,
      destinatario,
      destinatario_nome_original: extracted.destinatario_nome || '',
      destinatario_documento: docDigits,
      tipo,
      descricao: extracted.descricao || '',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('extract-comprovante error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Erro desconhecido' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
