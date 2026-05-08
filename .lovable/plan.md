## Objetivo

Garantir que o PDF (Cobrança, Expedição, Extras/Cintos — qualquer relatório que mostre **valor**) **nunca** seja gerado com preço desatualizado da fila passiva. Antes de desenhar o PDF, recomputamos o preço de cada pedido filtrado e gravamos o valor novo no banco se for diferente.

## Como vai funcionar

1. Quando o usuário clicar em **Gerar PDF** num relatório financeiro:
   - Primeiro mostra um pequeno indicador "Atualizando preços… (X de N)".
   - Para cada pedido do filtro, roda `computeTotalToSave` (mesma função que o detalhe usa).
   - Se o valor calculado ≠ `preco` salvo, faz um `UPDATE` no Supabase com o valor correto + `preco_migrado_v2 = true`.
   - Atualiza o objeto em memória com o novo `preco`.
2. Só depois disso o PDF é gerado, usando os preços já corrigidos.
3. O nome do arquivo e o snapshot em `pdf_snapshots` saem com o valor certo.

## Onde aplicar

- `src/components/SpecializedReports.tsx` — função utilitária local `recomputePricesBeforePDF(orders)` chamada no início de:
  - `generateCobrancaPDF` (Cobrança)
  - `generateExpedicaoPDF` (Expedição)
  - `generateExtrasCintosPDF` (Extras/Cintos)
- A função usa `useFichaVariacoesLookup` + `useCustomOptions` (já carregados pelo componente) e `computeTotalToSave` de `src/lib/recomputeOrderPrice.ts`.

## Ganhos colaterais

- Resolve definitivamente o problema do PDF "atrasado" em relação ao banco — independente de quanto a fila passiva já processou.
- Se houver pedidos com `preco` ainda errado por bug (não só pela migração), o próprio relatório corrige no momento da geração.
- Nada muda visualmente no PDF; só acrescenta um *loading* curto antes do download.

## Detalhes técnicos

- Concorrência: rodar em lotes de 10 pedidos em paralelo (Promise.all em chunks) — para 26 pedidos é instantâneo, para 500+ não trava.
- Quem está com `preco_migrado_v2 = false` é prioridade; quem já está `true` também é checado, mas o UPDATE só acontece se o valor mudou (evita escrita à toa).
- Erros silenciosos: se um pedido falhar no recompute (faltou catálogo etc.), mantém o preço antigo e segue.
- A fila passiva (`precoBackfillQueue`) continua existindo como rede de segurança para quando o usuário só **visualiza** listas sem gerar PDF.

## Pendência separada (não entra neste plano)

A diferença de **R$ 5** entre o banco (R$ 8.430) e o seu esperado (R$ 8.425) só vai aparecer depois que o recompute rodar — se o valor continuar 8.430, é diferença de regra de preço de algum item; abrimos uma investigação específica nesse caso.
