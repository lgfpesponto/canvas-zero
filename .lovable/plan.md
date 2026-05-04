## Corrigir duplicação no Resumo Comissão Bordado

**Problema:** Ao mover Baixa Bordado → Entrada Bordado → Baixa Bordado, o pedido aparece 2x no relatório (uma para cada baixa do histórico).

**Regra:** uma baixa do bordado só conta se NÃO houver, depois dela, um evento de regressão (volta para "Entrada Bordado 7Estrivos" ou qualquer etapa anterior). Se houver regressão posterior àquela baixa, ela é ignorada. Avanços (Pesponto, Montagem, etc.) não invalidam — o pedido pode estar adiantado e a baixa ainda conta.

**Etapas consideradas "anteriores à baixa" (regressão):**
`Em aberto`, `Impresso`, `Aguardando`, `Aguardando Couro`, `Corte`, `Sem bordado`, `Bordado Dinei`, `Bordado Sandro`, `Bordado 7Estrivos`, `Entrada Bordado 7Estrivos`.

### Arquivo

`src/lib/pdfGenerators.ts` — função `generateBordadoBaixaResumoPDF` (linhas ~690-711).

### Mudança

```ts
const ETAPAS_ANTES_BAIXA = new Set([
  'Em aberto','Impresso','Aguardando','Aguardando Couro','Corte',
  'Sem bordado','Bordado Dinei','Bordado Sandro','Bordado 7Estrivos',
  'Entrada Bordado 7Estrivos',
]);

const linhas: Linha[] = [];
for (const o of orders) {
  const c = comissaoFor(o);
  if (!c.tipo) continue;
  const hist = Array.isArray(o.historico) ? o.historico : [];
  const sorted = [...hist]
    .filter((h: any) => h && typeof h.data === 'string')
    .sort((a: any, b: any) => {
      const ka = `${a.data} ${a.hora || '00:00'}`;
      const kb = `${b.data} ${b.hora || '00:00'}`;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
  // Baixas válidas = "Baixa Bordado 7Estrivos" sem regressão posterior
  const baixasValidas = sorted.filter((h: any, idx: number) => {
    if (h?.local !== 'Baixa Bordado 7Estrivos') return false;
    if (h.data < dataDe || h.data > dataAte || !isDiaUtil(h.data)) return false;
    for (let i = idx + 1; i < sorted.length; i++) {
      if (ETAPAS_ANTES_BAIXA.has(sorted[i]?.local)) return false;
    }
    return true;
  });
  if (baixasValidas.length === 0) continue;
  // Uma única linha por pedido (a última baixa válida)
  const baixa = baixasValidas[baixasValidas.length - 1];
  const entradaEntry = sorted.find((h: any) => h?.local === 'Entrada Bordado 7Estrivos');
  linhas.push({
    numero: String(o.numero || ''),
    barcode: barcodeOf(String(o.id || '')),
    tipo: c.tipo,
    comissao: c.valor,
    dataEntrada: entradaEntry?.data || '',
    dataBaixa: String(baixa.data || ''),
  });
}
```

**Resultado:**
- Baixa → regressão → nova Baixa: 1 linha (apenas a baixa atual).
- Baixa → avançou para Pesponto/Montagem: 1 linha (continua válida).
- Baixa → regressão sem nova baixa: 0 linhas.
