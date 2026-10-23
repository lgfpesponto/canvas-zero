// Limites de caracteres aceitos pelas transportadoras (Melhor Envio/Loggi/J&T e Correios).
// Acima disso a transportadora recusa gerar a etiqueta, mesmo com o frete pago.
export const LIMITES_ENDERECO = { nome: 50, logradouro: 50, numero: 10, complemento: 30, bairro: 30, cidade: 30 } as const;

const ROTULO: Record<keyof typeof LIMITES_ENDERECO, string> = {
  nome: 'Nome do destinatário', logradouro: 'Rua', numero: 'Número', complemento: 'Complemento', bairro: 'Bairro', cidade: 'Cidade',
};

const pega = (e: any, ...k: string[]) => { for (const x of k) if (e?.[x]) return String(e[x]).trim(); return ''; };

/** Normaliza o endereço salvo do pedido Bagy (chaves em inglês ou português). */
export function lerEnderecoBagy(e: any, nome?: string | null) {
  return {
    nome: String(nome ?? pega(e, 'receiver', 'name')).trim(),
    logradouro: pega(e, 'logradouro', 'street', 'rua'),
    numero: pega(e, 'numero', 'number'),
    complemento: pega(e, 'complemento', 'complement', 'detail'),
    bairro: pega(e, 'bairro', 'district', 'neighborhood'),
    cidade: pega(e, 'cidade', 'city'),
  };
}

/** Lista o que vai fazer a etiqueta dar erro: campo, tamanho atual e máximo. */
export function avisosEndereco(end: Partial<Record<keyof typeof LIMITES_ENDERECO, string>>): string[] {
  const out: string[] = [];
  (Object.keys(LIMITES_ENDERECO) as (keyof typeof LIMITES_ENDERECO)[]).forEach(k => {
    const v = String(end[k] ?? '').trim();
    const max = LIMITES_ENDERECO[k];
    if (v.length > max) out.push(`${ROTULO[k]} tem ${v.length} caracteres (máx. ${max}): "${v}"`);
  });
  if (!String(end.logradouro ?? '').trim()) out.push('Rua está vazia');
  if (!String(end.bairro ?? '').trim()) out.push('Bairro está vazio');
  return out;
}
