// Explica rejeições da SEFAZ em linguagem simples, apontando o campo com problema.

const LIMITES: { campo: string; rotulo: string; min: number; max: number }[] = [
  { campo: 'nome', rotulo: 'Nome do cliente', min: 2, max: 60 },
  { campo: 'logradouro', rotulo: 'Rua', min: 2, max: 60 },
  { campo: 'numero', rotulo: 'Número do endereço', min: 1, max: 60 },
  { campo: 'complemento', rotulo: 'Complemento', min: 1, max: 60 },
  { campo: 'bairro', rotulo: 'Bairro', min: 2, max: 60 },
  { campo: 'municipio', rotulo: 'Cidade', min: 2, max: 60 },
  { campo: 'email', rotulo: 'E-mail', min: 1, max: 60 },
];

const ESTRANHO = /[\u0000-\u001F\u007F]|[\u{1F000}-\u{1FFFF}]|[\u2600-\u27BF]|\uFE0F/u;

/** Verifica os dados que a SEFAZ exige no formato (schema). Retorna problemas encontrados. */
export function validarSchemaDestinatario(dest: any, itens: { descricao?: string; codigo?: string }[] = []): string[] {
  const p: string[] = [];
  if (!dest) return p;
  for (const l of LIMITES) {
    const v = dest[l.campo];
    if (v === null || v === undefined || String(v).trim() === '') {
      if (l.campo === 'numero') p.push('Número do endereço vazio — preencha o número ou "S/N".');
      continue;
    }
    const s = String(v).trim();
    if (s.length > l.max) p.push(`${l.rotulo} tem ${s.length} caracteres (máximo ${l.max}). Encurte.`);
    if (s.length < l.min) p.push(`${l.rotulo} muito curto (mínimo ${l.min} caracteres).`);
    if (ESTRANHO.test(s)) p.push(`${l.rotulo} tem emoji, quebra de linha ou caractere inválido.`);
  }
  const fone = String(dest.telefone ?? '').replace(/\D/g, '');
  if (fone && (fone.length < 6 || fone.length > 14)) p.push(`Telefone com ${fone.length} dígitos (aceito 6 a 14). Deixe só DDD + número.`);
  if (dest.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(dest.email).trim())) p.push('E-mail do cliente inválido.');
  itens.forEach((it, i) => {
    const d = String(it.descricao ?? '');
    if (d.length > 120) p.push(`Item ${i + 1}: descrição com ${d.length} caracteres (máximo 120).`);
    if (ESTRANHO.test(d)) p.push(`Item ${i + 1}: descrição com emoji ou caractere inválido.`);
    if (String(it.codigo ?? '').length > 60) p.push(`Item ${i + 1}: código/SKU com mais de 60 caracteres.`);
  });
  return p;
}

const CODIGOS: Record<string, string> = {
  '204': 'Nota duplicada: esse número já foi usado na SEFAZ.',
  '206': 'Número da nota já inutilizado.',
  '207': 'CNPJ do emitente inválido.',
  '209': 'Inscrição Estadual do emitente inválida.',
  '213': 'CNPJ do emitente difere do certificado digital.',
  '225': 'Algum dado está fora do formato exigido (tamanho, emoji ou campo vazio).',
  '228': 'Data de emissão muito antiga.',
  '233': 'Inscrição Estadual do cliente inválida.',
  '237': 'CPF do cliente inválido.',
  '208': 'CNPJ do cliente inválido.',
  '239': 'Versão do arquivo não suportada.',
  '272': 'Código do município do emitente inválido.',
  '273': 'Código do município do emitente não pertence à UF.',
  '280': 'Certificado digital inválido.',
  '281': 'Certificado digital vencido.',
  '297': 'Assinatura digital inválida.',
  '301': 'Emitente irregular na SEFAZ.',
  '302': 'Cliente irregular na SEFAZ.',
  '539': 'Duplicidade: já existe nota com essa numeração e chave diferente.',
  '532': 'Total do ICMS diferente da soma dos itens.',
  '564': 'Total dos produtos diferente da soma dos itens.',
  '610': 'Total da nota diferente da soma (produtos − desconto + frete).',
  '629': 'Valor do item não bate com quantidade × valor unitário.',
  '683': 'Modalidade de frete incompatível.',
  '694': 'Faltou o grupo de pagamento.',
  '696': 'Operação com não contribuinte deve indicar consumidor final.',
  '778': 'NCM inexistente — confira o NCM do produto.',
  '806': 'Operação com cliente de outro estado: CFOP incompatível.',
  '904': 'Informe a forma de pagamento correta.',
};

/** Monta a mensagem final: código + motivo da SEFAZ + explicação + campos problemáticos. */
export function explicarRejeicao(cStat: string, xMotivo: string, dest?: any, itens?: any[]): string {
  const base = `${cStat} - ${xMotivo}`;
  const dica = CODIGOS[cStat];
  const campos = validarSchemaDestinatario(dest, itens);
  let msg = base;
  if (dica) msg += ` → ${dica}`;
  if (campos.length) msg += ` Corrigir: ${campos.join(' · ')}`;
  else if (cStat === '225') msg += ' Confira nome, rua, número, complemento, bairro e telefone do cliente pelo lápis.';
  return msg;
}
