// Constrói as categorias da ficha da bota no mesmo formato/ordem do PDF
// (src/lib/pdfGenerators.ts linhas ~339-443). Reutilizado na tela de detalhes.

export type FichaField = { label: string; value: string };
export type FichaCategory = { title: string; fields: FichaField[] };

const lower = (s?: string | null) => (s || '').toString().toLowerCase();

const replaceBordadoVariado = (text: string | undefined, desc?: string) => {
  if (!text) return text || '';
  return text
    .split(', ')
    .map(b => (b.includes('Bordado Variado') && desc ? desc : b))
    .join(', ');
};

export function buildBootFichaCategories(order: any, opts?: { showCliente?: boolean }): FichaCategory[] {
  const categories: FichaCategory[] = [];
  const det: any = order.extraDetalhes || {};
  const showCliente = opts?.showCliente ?? true;

  // IDENTIFICAÇÃO
  const identFields: FichaField[] = [];
  if (order.sobMedida && order.sobMedidaDesc) identFields.push({ label: 'Sob medida:', value: lower(order.sobMedidaDesc) });
  if (order.desenvolvimento) identFields.push({ label: 'Desenv.:', value: lower(order.desenvolvimento) });
  if (showCliente && order.cliente) identFields.push({ label: 'Cliente:', value: lower(order.cliente) });
  if (identFields.length) categories.push({ title: 'IDENTIFICAÇÃO', fields: identFields });

  // COUROS
  const couros: FichaField[] = [];
  if (order.couroCano) couros.push({ label: 'Cano:', value: `${lower(order.couroCano)}${order.corCouroCano ? ' ' + lower(order.corCouroCano) : ''}` });
  if (order.couroGaspea) couros.push({ label: 'Gáspea:', value: `${lower(order.couroGaspea)}${order.corCouroGaspea ? ' ' + lower(order.corCouroGaspea) : ''}` });
  if (order.couroTaloneira) couros.push({ label: 'Taloneira:', value: `${lower(order.couroTaloneira)}${order.corCouroTaloneira ? ' ' + lower(order.corCouroTaloneira) : ''}` });
  if (couros.length) categories.push({ title: 'COUROS', fields: couros });

  // PESPONTO
  const pesp: FichaField[] = [];
  if (order.corLinha) pesp.push({ label: 'Linha:', value: lower(order.corLinha) });
  if (order.corBorrachinha) pesp.push({ label: 'Borrachinha:', value: lower(order.corBorrachinha) });
  if (order.corVivo) pesp.push({ label: 'Vivo:', value: lower(order.corVivo) });
  if (pesp.length) categories.push({ title: 'PESPONTO', fields: pesp });

  // SOLADOS
  const solado: FichaField[] = [];
  const solaType = `${order.solado || 'Borracha'} ${order.formatoBico || 'quadrada'}`.toLowerCase();
  solado.push({ label: 'Tipo:', value: solaType });
  if (order.corSola) solado.push({ label: 'Cor:', value: lower(order.corSola) });
  if (order.corVira && !['Bege', 'Neutra'].includes(order.corVira)) solado.push({ label: 'Vira:', value: lower(order.corVira) });
  categories.push({ title: 'SOLADOS', fields: solado });

  // BORDADOS
  const bord: FichaField[] = [];
  const bC = replaceBordadoVariado(order.bordadoCano, order.bordadoVariadoDescCano);
  const bG = replaceBordadoVariado(order.bordadoGaspea, order.bordadoVariadoDescGaspea);
  const bT = replaceBordadoVariado(order.bordadoTaloneira, order.bordadoVariadoDescTaloneira);
  if (bC) bord.push({ label: 'Cano:', value: `${lower(bC)}${order.corBordadoCano ? ' ' + lower(order.corBordadoCano) : ''}` });
  if (bG) bord.push({ label: 'Gáspea:', value: `${lower(bG)}${order.corBordadoGaspea ? ' ' + lower(order.corBordadoGaspea) : ''}` });
  if (bT) bord.push({ label: 'Taloneira:', value: `${lower(bT)}${order.corBordadoTaloneira ? ' ' + lower(order.corBordadoTaloneira) : ''}` });
  if (order.nomeBordadoDesc || order.personalizacaoNome) bord.push({ label: 'Nome:', value: lower(order.nomeBordadoDesc || order.personalizacaoNome) });
  if (bord.length) categories.push({ title: 'BORDADOS', fields: bord });

  // LASER E RECORTES
  const laser: FichaField[] = [];
  if (order.laserCano) laser.push({ label: 'Cano:', value: `${lower(order.laserCano)}${order.corGlitterCano ? ' ' + lower(order.corGlitterCano) : ''}` });
  if (order.laserGaspea) laser.push({ label: 'Gáspea:', value: `${lower(order.laserGaspea)}${order.corGlitterGaspea ? ' ' + lower(order.corGlitterGaspea) : ''}` });
  if (order.laserTaloneira) laser.push({ label: 'Taloneira:', value: `${lower(order.laserTaloneira)}${order.corGlitterTaloneira ? ' ' + lower(order.corGlitterTaloneira) : ''}` });
  if (order.recorteCano) laser.push({ label: 'Recorte cano:', value: `${lower(order.recorteCano)}${order.corRecorteCano ? ' ' + lower(order.corRecorteCano) : ''}` });
  if (order.recorteGaspea) laser.push({ label: 'Recorte gáspea:', value: `${lower(order.recorteGaspea)}${order.corRecorteGaspea ? ' ' + lower(order.corRecorteGaspea) : ''}` });
  if (order.recorteTaloneira) laser.push({ label: 'Recorte taloneira:', value: `${lower(order.recorteTaloneira)}${order.corRecorteTaloneira ? ' ' + lower(order.corRecorteTaloneira) : ''}` });
  if (order.pintura === 'Sim') laser.push({ label: 'Pintura:', value: order.pinturaDesc || 'sim' });
  if (laser.length) categories.push({ title: 'LASER E RECORTES', fields: laser });

  // ESTAMPA
  if (order.estampa === 'Sim') {
    categories.push({ title: 'ESTAMPA', fields: [{ label: '', value: order.estampaDesc || 'sim' }] });
  }

  // METAIS
  const cavaloMetalQtd = det.cavaloMetal ? (Number(det.cavaloMetalQtd) || 0) : 0;
  const bolaGrandeQtd = Number(det.bolaGrandeQtd) || 0;
  const hasMetalData = !!(order.metais || order.tipoMetal || order.corMetal ||
    order.strassQtd || order.cruzMetalQtd || order.bridaoMetalQtd || cavaloMetalQtd || bolaGrandeQtd);
  if (hasMetalData) {
    const metaisFields: FichaField[] = [];
    if (order.metais || order.tipoMetal || order.corMetal) {
      const parts: string[] = [];
      if (order.metais) parts.push(lower(order.metais));
      if (order.tipoMetal) parts.push(lower(order.tipoMetal));
      if (order.corMetal) parts.push(lower(order.corMetal));
      metaisFields.push({ label: 'Metais:', value: parts.join(', ') });
    }
    const extras: string[] = [];
    if (order.strassQtd) extras.push(`strass x${order.strassQtd}`);
    if (bolaGrandeQtd) extras.push(`bola grande x${bolaGrandeQtd}`);
    if (order.cruzMetalQtd) extras.push(`cruz x${order.cruzMetalQtd}`);
    if (order.bridaoMetalQtd) extras.push(`bridão x${order.bridaoMetalQtd}`);
    if (cavaloMetalQtd) extras.push(`cavalo x${cavaloMetalQtd}`);
    if (extras.length) metaisFields.push({ label: '', value: extras.join(', ') });
    categories.push({ title: 'METAIS', fields: metaisFields });
  }

  // EXTRAS
  const extrasFields: FichaField[] = [];
  if (order.acessorios) extrasFields.push({ label: 'Acessórios:', value: order.acessorios });
  if (order.trisce === 'Sim') extrasFields.push({ label: 'Tricê:', value: order.triceDesc ? lower(order.triceDesc) : 'sim' });
  if (order.tiras === 'Sim') extrasFields.push({ label: 'Tiras:', value: order.tirasDesc ? lower(order.tirasDesc) : 'sim' });
  if (det.franja || order.franja === 'Sim') extrasFields.push({ label: 'Franja:', value: [det.franjaCouro, det.franjaCor].filter(Boolean).join(' — ').toLowerCase() || 'sim' });
  if (det.corrente || order.corrente === 'Sim') extrasFields.push({ label: 'Corrente:', value: lower(det.correnteCor) || 'sim' });
  if (order.costuraAtras === 'Sim') extrasFields.push({ label: 'Costura atrás:', value: 'sim' });
  if (order.carimbo) extrasFields.push({ label: 'Carimbo:', value: `${order.carimbo}${order.carimboDesc ? ' - ' + order.carimboDesc : ''}` });
  if (extrasFields.length) categories.push({ title: 'EXTRAS', fields: extrasFields });

  // ADICIONAL
  if (order.adicionalDesc || order.adicionalValor) {
    categories.push({
      title: 'ADICIONAL',
      fields: [{ label: '', value: `${order.adicionalDesc || ''}${order.adicionalValor ? ' R$' + order.adicionalValor : ''}`.trim() }],
    });
  }

  // OBS
  if (order.observacao) {
    categories.push({ title: 'OBS', fields: [{ label: '', value: order.observacao }] });
  }

  return categories;
}
