/** Lê o XML de uma NF-e (assinado/autorizado) e devolve frete, desconto, transporte e volumes no formato do formulário. */
const br = (v: string | null | undefined) => {
  const n = Number(v ?? '');
  return v && Number.isFinite(n) && n > 0 ? n.toFixed(2).replace('.', ',') : '';
};

export function resgatarDoXml(xml: string | null | undefined) {
  if (!xml) return null;
  let doc: Document;
  try { doc = new DOMParser().parseFromString(xml, 'text/xml'); } catch { return null; }
  if (doc.getElementsByTagName('parsererror').length) return null;
  const q = (parent: Element | Document | null | undefined, tag: string) =>
    parent ? (parent.getElementsByTagName(tag)[0] as Element | undefined) : undefined;
  const t = (parent: Element | Document | null | undefined, tag: string) => q(parent, tag)?.textContent?.trim() ?? '';

  const tot = q(doc, 'ICMSTot');
  const transp = q(doc, 'transp');
  const tr = q(transp, 'transporta');
  const veic = q(transp, 'veicTransp');
  const vol = q(transp, 'vol');
  const ent = q(doc, 'entrega');
  const modFrete = t(transp, 'modFrete');

  return {
    frete: br(t(tot, 'vFrete')),
    seguro: br(t(tot, 'vSeg')),
    desconto: br(t(tot, 'vDesc')),
    outras: br(t(tot, 'vOutro')),
    modFrete: modFrete !== '' ? Number(modFrete) : undefined,
    tPag: t(q(doc, 'detPag'), 'tPag') || undefined,
    transp: {
      razao: t(tr, 'xNome'), cnpj: t(tr, 'CNPJ') || t(tr, 'CPF'), ie: t(tr, 'IE'),
      endereco: t(tr, 'xEnder'), municipio: t(tr, 'xMun'), uf: t(tr, 'UF'),
      placa: t(veic, 'placa'), ufPlaca: t(veic, 'UF'), rntc: t(veic, 'RNTC'),
      qVol: t(vol, 'qVol'), esp: t(vol, 'esp'), marca: t(vol, 'marca'), nVol: t(vol, 'nVol'),
      pesoL: t(vol, 'pesoL').replace('.', ','), pesoB: t(vol, 'pesoB').replace('.', ','),
    },
    entrega: ent ? {
      logradouro: t(ent, 'xLgr'), numero: t(ent, 'nro'), bairro: t(ent, 'xBairro'),
      municipio: t(ent, 'xMun'), uf: t(ent, 'UF'), cep: t(ent, 'CEP'), cod_municipio: t(ent, 'cMun'),
    } : null,
  };
}

/** Preenche no _form apenas o que estiver vazio, usando o XML. */
export function completarFormComXml(form: any, xml: string | null | undefined) {
  const x = resgatarDoXml(xml);
  if (!x) return form;
  const f = { ...form };
  const vazio = (v: any) => v == null || String(v).trim() === '' || String(v) === '0';
  for (const k of ['frete', 'seguro', 'desconto', 'outras'] as const) if (vazio(f[k]) && x[k]) f[k] = x[k];
  if (f.modFrete == null && x.modFrete != null) f.modFrete = x.modFrete;
  if (!f.tPag && x.tPag) f.tPag = x.tPag;
  const ex = { ...(f.ex || {}) };
  const tr = { ...(ex.transp || {}) };
  for (const [k, v] of Object.entries(x.transp)) if (vazio(tr[k]) && v) tr[k] = v;
  ex.transp = tr;
  if (x.entrega && !ex.entregaDif) { ex.entregaDif = true; ex.entrega = { ...(ex.entrega || {}), ...x.entrega }; }
  f.ex = ex;
  return f;
}
