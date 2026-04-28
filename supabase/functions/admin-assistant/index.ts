// Admin Assistant - Chat IA exclusivo para admin_master
// Streaming SSE + Tool calling (consultas read-only ao banco)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o "Assistente 7Estrivos", uma IA especializada no portal interno de gestão de pedidos da fábrica de botas, cintos e acessórios 7ESTRIVOS. Você conversa **apenas com a Juliana (admin_master)** ou outras admins master da empresa.

# Sua função
Ajudar a admin a:
- Investigar problemas (pedidos travados, saldos errados, erros do sistema, dúvidas de regra de negócio).
- Consultar dados reais do banco quando perguntada (use as **tools** disponíveis — não invente dados).
- Sugerir planos de ação para resolver problemas. **Você NUNCA executa ações destrutivas** — só consulta e sugere. Toda mudança real é feita manualmente pela admin nas telas do portal.
- Explicar regras do sistema com clareza e em português brasileiro.

# Estilo
- Responda em **português brasileiro**, direto e prático.
- Use **markdown** (listas, negrito, código, tabelas quando útil).
- Quando consultar dados via tool, **mostre o resultado de forma legível** (não cole JSON cru — sumarize).
- Quando sugerir plano de ação, use lista numerada.
- Se faltar dado, **peça pra admin** ou **use uma tool** pra buscar.

# Regras de negócio principais (7ESTRIVOS)

## Roles
- **admin_master** (Juliana, login \`7estrivos\`): acesso total. Única que pode apagar registros.
- **admin_producao** (Fernanda): admin sem acesso a vendas e sem permissão de apagar. NÃO pode ser vendedora.
- **vendedor**: revendedor padrão.
- **vendedor_comissao**: revendedor com regras especiais de comissão (ex: Rancho Chique / Site).

## Pedidos (tabela \`orders\`)
- Numeração: padrão \`7E-AAAA0001\` (ano + sequencial).
- Tipos: bota (default, sem \`tipo_extra\`) ou extras (\`tipo_extra\` = 'cinto', 'kit_faca', 'tiras_laterais', 'revitalizador', 'bota_pronta_entrega', 'gravata_pronta_entrega', etc).
- Status do fluxo: Em aberto → Impresso → Aguardando → Corte → Baixa Corte → Sem bordado / Bordado (Dinei/Sandro/7Estrivos) → Pesponto 01-05 → Montagem → Revisão → Expedição → Entregue → Cobrado → Pago.
- Status especiais: **Cancelado** (excluído de vendas/comissão, exige motivo).
- Prefixos excluídos de métricas de venda: TROCA, REFAZENDO, ERRO, INFLUENCER.
- Vendedor "Estoque" = pedidos internos (não conta como venda real).
- Clientes da Juliana são **vendedores virtuais** (filtrados por \`cliente\` quando vendedor='Juliana Cristina Ribeiro').

## Prazos (dias úteis, descontando feriados)
- Bota: 15 dias úteis.
- Cinto: 5 dias úteis.
- Demais extras: 1 dia útil.

## Saldo do revendedor (módulo Financeiro / Saldo)
- Tabelas: \`revendedor_comprovantes\` (entradas), \`revendedor_saldo_movimentos\` (todos movimentos), \`revendedor_baixas_pedido\` (baixas em pedidos cobrados).
- View útil: \`vw_revendedor_saldo\`.
- Função RPC: \`saldo_atual_revendedor(_vendedor)\`.
- Baixa automática: quando admin aprova comprovante, sistema tenta baixa integral em pedidos com status 'Cobrado' (FIFO).

## Pedidos em alerta (atrasados)
- Pedido está atrasado quando passou do prazo e ainda NÃO chegou em status de conclusão (Entregue/Cobrado/Pago) — ou chegou e regrediu.

## Notificações ao vendedor
- Tabela \`order_notificacoes\`. RPC: \`registrar_alteracoes_pos_entrega\`. Sino do header notifica quando pedido entregue/cobrado/pago é alterado.

# Tools disponíveis
Você tem 7 tools pra consultar o banco (sempre que precisar de dado real, USE as tools — não chute):
- \`consultar_pedido\` — busca um pedido por número (\`7E-AAAA0001\`) ou ID parcial.
- \`listar_pedidos\` — lista pedidos com filtros (vendedor, status, tipo, período).
- \`consultar_vendedor\` — resumo de um vendedor: total de pedidos, status, valores.
- \`consultar_saldo_revendedor\` — saldo atual + últimos movimentos de um revendedor.
- \`consultar_estatisticas\` — totais de produção e vendas.
- \`consultar_pedidos_em_alerta\` — lista pedidos atrasados ou regredidos.
- \`consultar_logs_recentes\` — últimos erros de uma edge function (debug).

# IMPORTANTE
- **Nunca invente** dados de pedidos, vendedores ou saldos. Sempre use a tool correspondente.
- **Nunca afirme que executou uma ação** — você só consulta. Quando sugerir mudança, oriente onde a admin deve clicar no portal.
- Se a admin descrever um erro do console/sistema, peça (ou consulte via tool) os dados relacionados antes de diagnosticar.
- Mantenha respostas focadas e curtas quando possível. Detalhe quando o problema for complexo.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "consultar_pedido",
      description: "Busca um pedido específico pelo número (formato 7E-AAAA0001) ou pelos últimos caracteres do ID. Retorna todos os dados do pedido.",
      parameters: {
        type: "object",
        properties: {
          identificador: { type: "string", description: "Número do pedido (ex: 7E-AAAA0123) ou últimos 6+ caracteres do UUID" },
        },
        required: ["identificador"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_pedidos",
      description: "Lista pedidos com filtros opcionais. Retorna no máximo 50 pedidos ordenados por data desc.",
      parameters: {
        type: "object",
        properties: {
          vendedor: { type: "string", description: "Nome completo do vendedor" },
          status: { type: "string", description: "Status exato do pedido" },
          tipo_extra: { type: "string", description: "Tipo extra (cinto, kit_faca, etc) ou 'bota' para botas" },
          data_de: { type: "string", description: "Data inicial YYYY-MM-DD" },
          data_ate: { type: "string", description: "Data final YYYY-MM-DD" },
          limite: { type: "number", description: "Máximo de pedidos (default 20, máx 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_vendedor",
      description: "Retorna um resumo de um vendedor: total de pedidos por status, valor em aberto, últimos pedidos.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome completo do vendedor" },
        },
        required: ["nome"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_saldo_revendedor",
      description: "Retorna o saldo atual e os últimos 20 movimentos de saldo de um revendedor.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome completo do revendedor" },
        },
        required: ["nome"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_estatisticas",
      description: "Retorna estatísticas gerais do sistema: total de pedidos, em produção, atrasados, valor total.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_pedidos_em_alerta",
      description: "Lista pedidos que estão atrasados (passaram do prazo) ou que regrediram após status de conclusão.",
      parameters: {
        type: "object",
        properties: {
          limite: { type: "number", description: "Máximo de pedidos (default 30, máx 100)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_logs_recentes",
      description: "Busca os últimos logs de erro de uma edge function específica para debug.",
      parameters: {
        type: "object",
        properties: {
          funcao: { type: "string", description: "Nome da edge function (ex: create-user, extract-comprovante)" },
          limite: { type: "number", description: "Máximo de logs (default 10, máx 30)" },
        },
        required: ["funcao"],
      },
    },
  },
];

// ───────── Tool implementations (admin client - bypassa RLS) ─────────
function makeAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
}

async function tool_consultar_pedido(args: any) {
  const admin = makeAdminClient();
  const id = String(args.identificador || "").trim();
  if (!id) return { erro: "identificador vazio" };

  // Tenta por número primeiro
  if (id.toUpperCase().startsWith("7E-")) {
    const { data, error } = await admin.from("orders").select("*").eq("numero", id).maybeSingle();
    if (error) return { erro: error.message };
    if (data) return { pedido: data };
  }

  // Tenta por sufixo do UUID
  const { data, error } = await admin.rpc("find_order_by_id_suffix", { suffix: id.toLowerCase() });
  if (error) return { erro: error.message };
  if (Array.isArray(data) && data.length > 0) return { pedido: data[0] };
  return { erro: "Pedido não encontrado", buscado: id };
}

async function tool_listar_pedidos(args: any) {
  const admin = makeAdminClient();
  const limite = Math.min(Number(args.limite) || 20, 50);
  let q = admin.from("orders").select("id, numero, vendedor, cliente, status, tipo_extra, modelo, preco, quantidade, data_criacao, dias_restantes").order("created_at", { ascending: false }).limit(limite);

  if (args.vendedor) q = q.eq("vendedor", args.vendedor);
  if (args.status) q = q.eq("status", args.status);
  if (args.tipo_extra) {
    if (args.tipo_extra === "bota") q = q.is("tipo_extra", null);
    else q = q.eq("tipo_extra", args.tipo_extra);
  }
  if (args.data_de) q = q.gte("data_criacao", args.data_de);
  if (args.data_ate) q = q.lte("data_criacao", args.data_ate);

  const { data, error } = await q;
  if (error) return { erro: error.message };
  return { total: data?.length || 0, pedidos: data || [] };
}

async function tool_consultar_vendedor(args: any) {
  const admin = makeAdminClient();
  const nome = String(args.nome || "").trim();
  if (!nome) return { erro: "nome vazio" };

  const { data: pedidos, error } = await admin
    .from("orders")
    .select("id, numero, status, preco, quantidade, data_criacao, tipo_extra")
    .or(`vendedor.eq.${nome},and(vendedor.eq.Juliana Cristina Ribeiro,cliente.eq.${nome})`)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return { erro: error.message };

  const porStatus: Record<string, number> = {};
  let valorTotal = 0;
  let valorEmAberto = 0;
  for (const p of pedidos || []) {
    porStatus[p.status] = (porStatus[p.status] || 0) + 1;
    const v = Number(p.preco || 0) * Number(p.quantidade || 1);
    valorTotal += v;
    if (!["Pago", "Cancelado"].includes(p.status)) valorEmAberto += v;
  }

  return {
    vendedor: nome,
    total_pedidos: pedidos?.length || 0,
    valor_total: valorTotal,
    valor_em_aberto: valorEmAberto,
    pedidos_por_status: porStatus,
    ultimos_10: (pedidos || []).slice(0, 10),
  };
}

async function tool_consultar_saldo_revendedor(args: any) {
  const admin = makeAdminClient();
  const nome = String(args.nome || "").trim();
  if (!nome) return { erro: "nome vazio" };

  const { data: saldo, error: sErr } = await admin.rpc("saldo_atual_revendedor", { _vendedor: nome });
  if (sErr) return { erro: sErr.message };

  const { data: movs, error: mErr } = await admin
    .from("revendedor_saldo_movimentos")
    .select("*")
    .eq("vendedor", nome)
    .order("created_at", { ascending: false })
    .limit(20);
  if (mErr) return { erro: mErr.message };

  return { vendedor: nome, saldo_atual: saldo, ultimos_movimentos: movs || [] };
}

async function tool_consultar_estatisticas() {
  const admin = makeAdminClient();
  const { data: prod } = await admin.rpc("get_production_counts");
  const { data: tot } = await admin.rpc("get_orders_totals");

  // Pedidos atrasados (heurística: dias_restantes <= 0 e status fora de conclusão)
  const { count: atrasados } = await admin
    .from("orders")
    .select("*", { count: "exact", head: true })
    .lte("dias_restantes", 0)
    .not("status", "in", '("Entregue","Cobrado","Pago","Cancelado")');

  return {
    producao: prod?.[0] || null,
    totais_geral: tot?.[0] || null,
    pedidos_atrasados_aprox: atrasados || 0,
  };
}

async function tool_consultar_pedidos_em_alerta(args: any) {
  const admin = makeAdminClient();
  const limite = Math.min(Number(args.limite) || 30, 100);

  const { data, error } = await admin
    .from("orders")
    .select("id, numero, vendedor, cliente, status, modelo, tipo_extra, dias_restantes, data_criacao")
    .lte("dias_restantes", 0)
    .not("status", "in", '("Entregue","Cobrado","Pago","Cancelado")')
    .order("dias_restantes", { ascending: true })
    .limit(limite);

  if (error) return { erro: error.message };
  return { total: data?.length || 0, pedidos: data || [] };
}

async function tool_consultar_logs_recentes(args: any) {
  // Tool informativa - logs reais ficam no dashboard Supabase
  const funcao = String(args.funcao || "").trim();
  if (!funcao) return { erro: "funcao vazia" };
  return {
    aviso: `Para ver logs em tempo real da função "${funcao}", acesse o dashboard Supabase em: https://supabase.com/dashboard/project/uxpcqqxlypshickabeyq/functions/${funcao}/logs`,
    sugestao: "Cole os logs específicos aqui no chat que eu analiso pra você.",
  };
}

async function executeTool(name: string, args: any): Promise<any> {
  try {
    switch (name) {
      case "consultar_pedido": return await tool_consultar_pedido(args);
      case "listar_pedidos": return await tool_listar_pedidos(args);
      case "consultar_vendedor": return await tool_consultar_vendedor(args);
      case "consultar_saldo_revendedor": return await tool_consultar_saldo_revendedor(args);
      case "consultar_estatisticas": return await tool_consultar_estatisticas();
      case "consultar_pedidos_em_alerta": return await tool_consultar_pedidos_em_alerta(args);
      case "consultar_logs_recentes": return await tool_consultar_logs_recentes(args);
      default: return { erro: `Tool desconhecida: ${name}` };
    }
  } catch (e: any) {
    return { erro: `Erro ao executar tool: ${e?.message || String(e)}` };
  }
}

// ───────── HTTP handler ─────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. Autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // 2. Verifica role admin_master
    const adminClient = makeAdminClient();
    const { data: hasMaster, error: roleErr } = await adminClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin_master",
    });
    if (roleErr || !hasMaster) {
      return new Response(JSON.stringify({ error: "Acesso restrito a admin_master" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Body
    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const model = body.model || "google/gemini-3-flash-preview";

    // 4. Loop de tool calling (até 5 iterações para evitar loops infinitos)
    const conversation: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (let iter = 0; iter < 5; iter++) {
      // Chamada NÃO-streaming para detectar tool calls
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: conversation,
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições atingido. Aguarde alguns segundos." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResp.status === 402) {
          return new Response(JSON.stringify({ error: "Saldo de IA esgotado. Adicione créditos em Settings → Cloud & AI balance." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errText = await aiResp.text();
        console.error("AI Gateway error:", aiResp.status, errText);
        return new Response(JSON.stringify({ error: `Erro na IA: ${aiResp.status}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResp.json();
      const choice = aiData.choices?.[0];
      const msg = choice?.message;

      if (!msg) {
        return new Response(JSON.stringify({ error: "Resposta vazia da IA" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const toolCalls = msg.tool_calls;

      if (Array.isArray(toolCalls) && toolCalls.length > 0) {
        // Adiciona a mensagem da IA com as tool_calls
        conversation.push({
          role: "assistant",
          content: msg.content || "",
          tool_calls: toolCalls,
        });

        // Executa cada tool e adiciona o resultado
        for (const tc of toolCalls) {
          let parsedArgs: any = {};
          try { parsedArgs = JSON.parse(tc.function?.arguments || "{}"); } catch { parsedArgs = {}; }
          const result = await executeTool(tc.function?.name, parsedArgs);
          conversation.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result).slice(0, 8000), // limita tamanho
          });
        }
        // Continua o loop pra IA processar os resultados
        continue;
      }

      // Sem tool calls - resposta final
      return new Response(JSON.stringify({
        content: msg.content || "",
        finish_reason: choice.finish_reason,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      content: "Resposta interrompida (limite de iterações de ferramentas atingido).",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("admin-assistant error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
