# Plano em duas fases

## Fase 1 — Finalizar o que já foi iniciado

Itens da rodada anterior que precisam ficar 100% estáveis e testáveis antes de seguir:

1. **Bloqueio de "Pago"/"Cobrado" manual**
   - Confirmar que `statusTransitions.ts` esconde essas opções do seletor (já feito).
   - Validar trigger `trg_orders_block_manual_pago_cobrado` no banco e ajustar funções legítimas (`tentar_baixa_automatica`, RPC de cobrança) para setarem o flag de sessão `app.allow_status_pago` / `app.allow_status_cobrado` antes do UPDATE.

2. **Solicitação de ajuste de valor (vendedor → admin)**
   - Verificar `AjusteValorSolicitacao.tsx` no detalhe do pedido (aparece apenas em `status = 'Entregue'`).
   - Página admin `/admin/solicitacoes-ajuste` lista pendentes com Aprovar/Negar; aprovação dispara `decidir_ajuste_solicitacao` que aplica novo valor + registra no histórico + notifica vendedor pelo sino.
   - Card no `AdminDashboard` mostrando contagem de pendentes.

3. **Diálogo pós-PDF "Marcar como Cobrado"**
   - Já adicionado em `SpecializedReports.tsx` (state + dialog). Validar visualmente que abre após gerar PDF de cobrança e que `marcar_pedidos_como_cobrado` muda só os pedidos do snapshot.

4. **QA rápido**
   - Login Juliana: tentar mudar pedido manualmente para "Cobrado" → deve estar oculto.
   - Vendedor: solicitar ajuste em pedido Entregue → aparece no dashboard admin.
   - Admin: aprovar → pedido recebe novo preço e linha no histórico.
   - Gerar PDF de cobrança → dialog aparece e marca como Cobrado ao confirmar.

## Fase 2 — Regerar PDF de cobrança da Maria Gabriela (preços atuais)

Contexto: o snapshot de 19/05/2026 saiu R$ 354.376,80; valor atual é R$ 352.738,80 (Δ −R$ 1.638,00). Precisa um novo PDF idêntico em layout ao anexado, com **preços atuais** e mantendo descontos com bolinha vermelha/verde e justificativa na composição.

### Como será gerado

- Reutilizar o fluxo `generateCobrancaPDF` de `SpecializedReports.tsx` (mesmo layout do PDF anexo).
- Carregar exatamente os `order_ids` do snapshot de 19/05/2026 da Maria Gabriela em `pdf_snapshots` (não refiltrar por data, para garantir o mesmo conjunto de 1.191 pares).
- Para cada pedido, recalcular `getOrderFinalValue` com a tabela de preços atual (sem `preco_congelado` interferindo na exibição — usa preço atual da composição).
- Manter exibição de desconto: bolinha verde quando o pedido tem desconto registrado e vermelha quando houve acréscimo retroativo; texto da justificativa (`desconto_justificativa` / linha do histórico de ajuste) sai na coluna Composição, como no PDF original.
- Cabeçalho e nome do arquivo seguem o padrão atual: `Cobrança - Maria Gabriela - 26-05-2026 - R$ 352.738,80 - 1191 pares.pdf`.

### Ponto de acesso

- Adicionar botão "Regerar com preços atuais" na aba **Histórico de PDFs** (`/admin/configuracoes`) em cada snapshot de cobrança.
- Ao clicar, abre dialog confirmando: "Vai gerar novo PDF com os mesmos N pedidos, valor atual R$ X (Δ vs snapshot)". Confirmando, baixa o novo PDF e registra um novo snapshot.

### Detalhes técnicos

- Função nova `regenerarCobrancaPDFFromSnapshot(snapshotId)` em `src/lib/pdfGenerators.ts` que:
  1. Lê `pdf_snapshots` → pega `order_ids` + `filtros`.
  2. `supabase.from('orders').select('*').in('id', order_ids)` + `dbRowToOrder` + `recomputePricesBatch` (preços atuais).
  3. Chama o mesmo gerador interno usado por `generateCobrancaPDF` (extrair em helper compartilhado).
  4. `registrarPdfSnapshot` com `tipo='cobranca_regerada'` referenciando o snapshot original.
- Indicador de delta (verde/vermelha) por pedido: comparar `valor_atual` com `preco_anterior`/`preco_congelado` quando existir, ou usar última entrada de `alteracoes` para definir cor + justificativa.

## Arquivos previstos (Fase 2)

- `src/lib/pdfGenerators.ts` — extrair helper `buildCobrancaPDF(orders, opts)` e adicionar `regenerarCobrancaPDFFromSnapshot`.
- `src/components/SpecializedReports.tsx` — refatorar `generateCobrancaPDF` para usar o helper.
- `src/pages/admin/PdfHistoricoPage.tsx` (ou equivalente) — botão "Regerar com preços atuais" + dialog de confirmação.

## Pergunta antes de implementar

Confirma este encadeamento? Quer que eu já execute a Fase 1 (estabilizar) agora e deixe a Fase 2 (regerar PDF da Maria Gabriela) para o próximo passo, ou prefere que eu já entregue tudo junto?
