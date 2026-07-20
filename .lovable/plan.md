Plano para corrigir sem mexer em pedidos já fechados:

1. **Corrigir a causa raiz no cálculo (Marrom + Borracha = R$ 20 / Marrom + PVC = R$ 0)**
   - Ajustar a resolução de preço de **Cor da Sola** para ser contextual em todos os pontos:
     - `src/lib/recomputeOrderPrice.ts` (composição canônica)
     - `src/pages/OrderDetailPage.tsx` (composição do detalhe)
     - `src/pages/EditOrderPage.tsx` (edição do pedido)
     - `src/lib/cobrancaPdf.ts` e `src/components/SpecializedReports.tsx` (PDFs) – já usam contextual, garantir consistência
     - `supabase/functions/reconciliar-precos/index.ts` (reconciliador do servidor)
   - Regra: para `cor_sola`, se existir uma variação da ficha com `relacionamento.solado` compatível com o solado do pedido, usar essa; senão usar a variação sem relacionamento; senão fallback contextual hardcoded.
   - `src/hooks/useFichaPriceForOrder.ts`: o índice do snapshot hoje faz `bySlugNome` sobrescrevendo variações repetidas — vai preservar a variante com relacionamento válido para o solado do pedido.

2. **Garantir que a linha apareça na Composição do Pedido**
   - Objetivo declarado pelo usuário: a Cor Sola Marrom hoje NÃO sai na composição, então o valor não soma. Após a correção, a composição deve mostrar `Cor Sola: Marrom — R$ 20,00` sempre que solado for Borracha, tanto no detalhe quanto no PDF de cobrança.

3. **Recalcular pedidos já afetados (sem tocar nos fechados)**
   - Aplicar recálculo pela regra corrigida (não ajuste cego de +20) em pedidos onde:
     - `cor_sola = Marrom` e `solado = Borracha` (bota, `tipo_extra` vazio)
     - `status` **NÃO** em: `Conferido`, `Cobrado`, `Pago`
   - Escopo confirmado: **1199 pedidos**.
   - Método: bumpar `preco_regra_versao` para forçar reprocessamento pela edge `reconciliar-precos` já com a lógica corrigida, ou rodar um UPDATE via RPC que aplica `computeTotalToSave` corrigido. Preserva `desconto`, `quantidade` e demais itens da composição.

4. **Proteção daqui pra frente**
   - Novos pedidos criados/editados usam o mesmo caminho corrigido — não voltará a zerar Marrom+Borracha.
   - Validação: abrir um pedido em aberto com Borracha + Marrom e confirmar:
     - a linha "Cor Sola: Marrom — R$ 20,00" aparece na composição;
     - o total do pedido inclui esse valor;
     - PVC + Marrom continua sem cobrar.