# Composição correta + varredura retroativa de preços

## Diagnóstico do bug

A função `getCorSolaOptions(modelo, solado, formatoBico)` em `src/lib/orderFieldsConfig.ts` já é **contextual** e retorna o preço certo (PVC = R$ 0 para todas as cores, Borracha + Marrom/Branco = R$ 20, Borracha + Preto = R$ 0). O formulário de pedido (`OrderPage`/`EditOrderPage`) usa essa função e calcula bem.

O furo está em **3 lugares** que ignoram o contexto e fazem `COR_SOLA.find(c => c.label === order.corSola)?.preco` direto — então qualquer "Marrom", mesmo em PVC, herda os R$ 20 da entrada Borracha+Marrom:

1. `src/pages/OrderDetailPage.tsx` linha 386-387 (composição do detalhe).
2. `src/components/SpecializedReports.tsx` linhas 352-353 (relatório de cobrança).
3. `src/components/SpecializedReports.tsx` linhas 1373-1374 (outro breakdown).

A "Marrom" duplicada em `solados-visual` (R$ 0) no banco é só ruído visual — não interfere no cálculo, que vem das constantes em `orderFieldsConfig.ts`. Pode ser ignorada ou removida via admin depois.

## O que será feito

### 1. Helper único de preço da cor da sola

Adicionar em `src/lib/orderFieldsConfig.ts`:

```ts
export function getCorSolaPrecoContextual(modelo: string, solado: string, formatoBico: string | undefined, corSola: string): number {
  const opts = getCorSolaOptions(modelo, solado, formatoBico);
  if (!opts) return 0;
  return opts.find(o => o.label === corSola)?.preco ?? 0;
}
```

Substituir os 3 pontos acima por essa função, passando `order.modelo`, `order.solado`, `order.formatoBico`, `order.corSola`. Resultado: PVC Marrom para de aparecer com R$ 20 na composição imediatamente, e o subtotal recalculado fica certo.

### 2. Auto-correção retroativa para LISTAGENS e RELATÓRIOS

Hoje a auto-correção em `OrderDetailPage` só roda quando alguém **abre** o pedido. Para que `MeusPedidos`, dashboards, cobrança e expedição já saiam certos sem isso:

**Opção escolhida — varredura única em background, executada pelo admin_master no primeiro acesso pós-deploy**, com checkpoint para não repetir.

- Criar `src/lib/recomputeOrderPrice.ts` com função pura `recomputeSubtotal(order, findFichaPrice, getByCategoria)` que devolve o subtotal real. A lógica é o mesmo `priceItems.reduce(...)` que hoje vive embutido em `OrderDetailPage`, extraído para arquivo isolado e usando o helper novo do item 1.
- Criar componente `<RecalcPrecosRunner />` montado dentro de `GestaoPage` (ou no shell do admin_master). Ao montar, faz:
  1. Lê flag `localStorage.recalc_precos_v1_done` — se já rodou, sai.
  2. Busca via Supabase todos os pedidos com `status NOT IN ('Cobrado', 'Pago')` (≈ 2.000 dos ~2.860 do banco).
  3. Para cada pedido, calcula `subtotalReal` via `recomputeSubtotal`. Se divergir de `order.preco × quantidade` (tolerância R$ 0,01), agrupa em batch de 200.
  4. Faz `UPDATE orders SET preco = ? WHERE id = ?` em paralelo (batches de 50 simultâneos para não estourar).
  5. Mostra toast de progresso ("Recalculando preços antigos: 412/1.937…") e ao terminar grava a flag + toast final ("X pedidos corrigidos").
- Como **plus**: botão manual "Recalcular preços" na aba Gestão para rodar de novo se necessário (limpa a flag e dispara).

### 3. Reforço no recálculo já existente

Manter o `useEffect` de auto-correção em `OrderDetailPage` (cobre pedidos que forem editados depois) e fazer ele usar a mesma `recomputeSubtotal` do item 2 — fonte única de verdade, evita drift futuro.

### 4. Pedidos Cobrado/Pago

Excluídos da varredura conforme pedido — preservam o histórico financeiro já fechado.

## Arquivos tocados

- `src/lib/orderFieldsConfig.ts` — adiciona `getCorSolaPrecoContextual`.
- `src/lib/recomputeOrderPrice.ts` — **novo**, função pura de cálculo.
- `src/pages/OrderDetailPage.tsx` — usa o helper novo + delega cálculo para `recomputeSubtotal`.
- `src/components/SpecializedReports.tsx` — usa `getCorSolaPrecoContextual` nas 2 ocorrências.
- `src/pages/GestaoPage.tsx` — monta `<RecalcPrecosRunner />` + botão manual.
- `src/components/gestao/RecalcPrecosRunner.tsx` — **novo**, componente da varredura.

## Resultado esperado

- Detalhe do pedido: "Cor Sola: Marrom" some quando solado é PVC; subtotal vira soma exata da composição; total = subtotal − desconto (ou + acréscimo).
- "Meus Pedidos" coluna **Valor total**: corrigido após a varredura rodar uma vez (≈ 30-60 s ao primeiro admin_master logar).
- PDFs de cobrança e expedição: saem com valores certos sem precisar abrir cada pedido.
- Pedidos Cobrado/Pago: intocados.
