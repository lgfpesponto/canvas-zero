## Correções

### 1. Erro "column updated_at of relation orders does not exist"
A RPC `aprovar_ajuste_solicitacao` faz `UPDATE orders SET ... updated_at = now()`, mas a tabela `orders` não tem essa coluna. Remover essa atribuição (deixando só `desconto`, `desconto_justificativa`, `preco`). Nova migração corrige a função.

### 2. Preview na página *Solicitações de Ajuste de Preço*
Trocar o mini-resumo atual pelo **topo real do pedido detalhado**, reaproveitando o próprio `OrderDetailPage`.

Abordagem: extrair o cabeçalho + composição do `OrderDetailPage` para um novo componente `OrderDetailHeader` (id + numero + vendedor + cliente + status + campos técnicos + composição do preço + subtotal + total). Usar esse componente:
- No `OrderDetailPage` (substitui o markup atual, sem mudar visual).
- No `SolicitacoesAjustePage`, dentro da linha expandida (com `useOrderById`).

Comportamento de clique:
- Setinha (▶) → expande/recolhe preview.
- Número do pedido → navega para `/pedido/:id` (comportamento antigo, como o usuário pediu).
- Ícone externo continua igual (redundante — pode remover para não poluir).

### Fora de escopo
- Não mexer no botão "Registrar Erro", "Conferido", nem em qualquer edição — o preview é somente leitura.
- Não incluir a seção "Edição de Valor" nem "Registrar Erro" no preview (só até composição/total, como pedido).
