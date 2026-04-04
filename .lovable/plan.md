

## Exclusão em massa de pedidos selecionados

### O que será feito

Adicionar um botão "Excluir selecionados" na página Meus Pedidos, visível quando mais de um pedido estiver selecionado. Ao clicar, um diálogo de confirmação aparece informando a quantidade. Após confirmar, todos os pedidos selecionados são excluídos.

### Alterações

#### 1. `src/contexts/AuthContext.tsx` — Nova função `deleteOrderBatch`

Criar uma função que recebe um array de IDs e deleta todos de uma vez no Supabase:
```ts
const deleteOrderBatch = async (ids: string[]) => {
  const { error } = await supabase.from('orders').delete().in('id', ids);
  if (!error) setOrders(prev => prev.filter(o => !ids.includes(o.id)));
};
```

Expor no contexto junto com `deleteOrder`.

#### 2. `src/pages/ReportsPage.tsx` — Botão + diálogo de confirmação

- Ao lado do botão "Mudar progresso de produção" (linha 217), adicionar um botão "Excluir selecionados" com ícone `Trash2`, estilo destrutivo, visível quando `selectedIds.size > 1`
- Usar `AlertDialog` para confirmação com mensagem: "Tem certeza que deseja excluir X pedidos? Esta ação não pode ser desfeita."
- Ao confirmar: chamar `deleteOrderBatch([...selectedIds])`, limpar seleção, mostrar toast de sucesso

### Resultado

Admin seleciona 2+ pedidos → botão vermelho "Excluir selecionados" aparece → clica → diálogo de confirmação → confirma → pedidos removidos da lista e do banco.

