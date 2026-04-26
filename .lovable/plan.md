## Ajustes na página "Meu Saldo" (`src/pages/RevendedorSaldoPage.tsx`)

Pequenos ajustes visuais na visão do revendedor (Stefany), sem mexer em nenhuma lógica de saldo, banco ou aprovação.

### 1. Renomear o card "Total recebido" → "Total enviado"
- Linha ~120: alterar apenas o texto do `CardTitle` de **"Total recebido"** para **"Total enviado"**.
- O valor exibido (`saldo?.total_recebido`) permanece igual — representa o total já creditado a partir dos comprovantes aprovados, que para o revendedor faz mais sentido como "enviado".
- Os 4 cards continuam: **Total enviado** · **Já utilizado** · **Saldo disponível** · **A pagar (pedidos cobrados)**.

### 2. Remover a seção "Meus pedidos cobrados"
- Remover o bloco `<Card>` inteiro (linhas ~155 a ~209) que renderiza a tabela "Meus pedidos cobrados".
- Limpar imports e estados que ficarem sem uso após a remoção:
  - Remover `fetchPedidosCobrados`, `fetchBaixasVendedor`, tipos `PedidoCobrado` e `RevendedorBaixa` do import de `@/lib/revendedorSaldo`.
  - Remover os states `pedidos`, `baixas` e a lógica `baixasMap` / `pedidosComStatus` que eram usados apenas para esta tabela.
  - Manter o cálculo de `totalPendente` (usado pelo card "A pagar") — será reescrito para somar diretamente o valor dos pedidos cobrados ainda não baixados, via uma versão simplificada usando `fetchPedidosCobrados` + `fetchBaixasVendedor` (mantemos os fetches só para alimentar o card, sem renderizar a tabela). Alternativa mais limpa: manter apenas o fetch e o cálculo numérico de `totalPendente`, sem o `useMemo` de status visual.
  - Remover imports não mais usados: `Table*`, `Badge` (se não for mais usado fora da tabela de comprovantes — verificar; ainda é usado na tabela "Meus comprovantes enviados", então mantém).

### O que **NÃO** muda
- Cabeçalho "Meu Saldo" + nome do revendedor + botão "Enviar comprovante".
- Os 4 cards de resumo (apenas o título do primeiro muda).
- Seção "Meus comprovantes enviados" (tabela de status/aprovações).
- Diálogo de envio de comprovante e o `ComprovanteViewer`.
- Nenhuma mudança em banco, RPCs, edge functions, painel admin ou aba Financeiro.

### Resultado visual final
1. Header + botão Enviar comprovante
2. 4 cards: **Total enviado** | Já utilizado | **Saldo disponível** | A pagar (pedidos cobrados)
3. **Meus comprovantes enviados** (tabela)
