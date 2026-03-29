

## Botão "Conferido" nos Pedidos em Alerta

### Abordagem

Usar `localStorage` para persistir os IDs dos pedidos conferidos. Isso é simples, não requer migração de banco, e funciona por dispositivo/admin.

### Alterações

**Arquivo**: `src/pages/Index.tsx`

#### 1. State para pedidos conferidos
- Adicionar state `checkedAlertIds` (Set de IDs) inicializado a partir de `localStorage` key `'alert_checked_orders'`
- Função `handleChecked(orderId)`: adiciona ID ao set, persiste no localStorage, atualiza state

#### 2. Filtrar pedidos conferidos na lista de alerta (linhas 204-208)
- Após o filtro existente de `alertOrders`, adicionar `.filter(o => !checkedAlertIds.has(o.id))`

#### 3. Botão "Conferido" em cada pedido (linhas 218-228)
- Adicionar botão "Conferido" (com ícone Check) ao lado direito de cada item
- `onClick` com `e.preventDefault()` + `e.stopPropagation()` (para não navegar pelo Link)
- Chamar `handleChecked(o.id)`

#### 4. Visibilidade
- O botão já está dentro do bloco `user?.nomeUsuario?.toLowerCase() === '7estrivos'` que é só para Juliana/admin. Manter assim — apenas admins veem a seção de alerta.

### Detalhes técnicos
- localStorage key: `'alert_checked_orders'` — array JSON de IDs
- Quando um pedido sai do estado de alerta naturalmente (status muda para Expedição/Entregue/etc), ele já não apareceria — o ID conferido no localStorage fica inerte
- Não requer migração SQL

