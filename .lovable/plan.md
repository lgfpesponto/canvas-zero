## Objetivo

Tratar o zeramento do pedido ERRO como um **desconto automático** aplicado no momento da criação, do mesmo jeito que o admin_master faria manualmente em "Edição de Valor" — deixando registro/auditoria — e garantir que o ERRO possa avançar até "Conferido" no progresso.

## Mudanças

### 1. `src/components/orders/RegistrarErroDialog.tsx` — desconto automático na criação
Ao gerar o ERRO (que hoje clona a composição do original), em vez de forçar `preco = 0` + `desconto = null`:

- Calcular `precoBruto` = mesma composição/subtotal × quantidade do pedido original (já é o que vai para `preco`).
- Gravar no novo pedido ERRO:
  - `preco = 0` (total final zerado, como hoje).
  - `desconto = precoBruto` (positivo = desconto — mesma convenção do fluxo manual).
  - `desconto_justificativa = "ERRO automático: " + <descrição do erro digitada>`.
  - Adicionar entrada em `alteracoes` / `historico` do próprio ERRO: "Desconto automático de R$ X aplicado (ERRO)".

Efeito: o ERRO passa a mostrar, em qualquer relatório/detalhe/PDF de auditoria, o mesmo padrão visual de um desconto manual (tag "DESC R$ X", justificativa registrada), só que gerado pelo sistema — e continua com total R$ 0,00 porque `preco` já vem zerado.

### 2. `src/lib/order-logic.ts` — remover o short-circuit forçado
Como o zeramento agora está gravado de verdade no banco (`preco = 0`, `desconto = bruto`), os helpers não precisam mais tratar ERRO como caso especial:

- `getOrderBaseValue`: remover `if (order.erroDePedidoId) return 0`.
- `getOrderFinalValue`: remover `if (order.erroDePedidoId) return 0` (o `preco = 0` do banco já resolve; o `subtotalOverride` continua respeitando o `desconto` gravado, o que também dá 0).

Isso mantém consistência: quem lê o pedido vê os mesmos campos que veria em qualquer pedido descontado — sem lógica escondida.

### 3. `src/pages/OrderDetailPage.tsx` — exibir bloco de desconto no ERRO
Reverter as duas condições que escondiam UI no ERRO:

- Voltar a mostrar o bloco **"Edição de Valor"** também em pedidos ERRO, **em modo somente leitura** — exibir a linha "Desconto: R$ X" + justificativa "ERRO automático: …", **sem** permitir editar o valor nem clicar em ajuste. Reaproveita o visual atual de desconto aplicado; some apenas os controles de edição/solicitação de ajuste no ERRO.
- Manter escondida a `AjusteValorSolicitacao` no ERRO (não faz sentido pedir ajuste em pedido simbólico).
- Composição do ERRO continua exibindo apenas a linha simbólica "ERRO — R$ 0,00" (sem re-adicionar Subtotal/Total internos).

### 4. Fluxo até "Conferido" no ERRO
- `PRODUCTION_STATUSES_USER` já inclui "Conferido"; `CONFERIDO_ONLY_ROLES = ['admin_master']` já garante que só o admin_master consegue marcar.
- Verificar `src/lib/statusTransitions.ts` para confirmar que existe transição válida para "Conferido" a partir das etapas anteriores usadas pelo ERRO. Se houver bloqueio específico que impeça o ERRO de chegar em "Conferido" (ex.: exigência de valor > 0 em algum guard), ajustar para permitir explicitamente quando `erroDePedidoId` estiver presente.
- Nenhuma mudança de UI extra: o mesmo checkbox/ação de "Conferido" que o admin_master já usa nos outros pedidos serve para o ERRO.

## Fora do escopo
- PDFs (cobrança, relatórios): nada a mudar — continuam somando `getOrderFinalValue` = 0 para o ERRO, agora por caminho natural (preco=0 gravado + desconto registrado).
- Comissão/vendas: continua ignorando pelo prefixo `ERRO` (EXCLUDED_PREFIXES).
- Backfill de ERROs antigos já criados sem `desconto` gravado: se existirem, tratar em migração separada só se o usuário pedir.

## Arquivos afetados
- `src/components/orders/RegistrarErroDialog.tsx`
- `src/lib/order-logic.ts`
- `src/pages/OrderDetailPage.tsx`
- `src/lib/statusTransitions.ts` (apenas se guard bloquear "Conferido" para ERRO)
