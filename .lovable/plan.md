## Objetivo

Permitir que o **admin_master** marque (ou desmarque) a tag **Conferido** em vários pedidos de uma só vez na tela de Relatórios, sem precisar abrir cada pedido.

## Como vai funcionar

1. Na tela `Relatórios`, seleciona-se os pedidos pelos checkbox/scanner (já existe).
2. Aparece um novo botão **"Marcar como conferido (N)"** ao lado dos botões de "Mudar progresso" / "Excluir selecionados", **visível apenas para admin_master** quando há ≥1 pedido selecionado.
3. Ao clicar, abre um pequeno diálogo de confirmação com duas opções:
   - **Marcar como conferido**
   - **Remover marcação**
4. Executa update em lote no Supabase, atualiza o cache, mostra toast com o total processado, limpa a seleção e recarrega a lista. Pedidos que já estavam no estado escolhido são ignorados (sem efeito colateral).

## Detalhes técnicos

**Arquivo: `src/pages/ReportsPage.tsx`**
- Adicionar botão na barra de ações em massa (próximo a `linhas 650-661`), gated por `user?.role === 'admin_master'` e `selectedIds.size > 0`.
- Novo estado `showConferidoDialog` + handler `handleBulkConferido(novo: boolean)` que:
  ```ts
  await supabase.from('orders').update({
    conferido: novo,
    conferido_em: novo ? new Date().toISOString() : null,
    conferido_por: novo ? user?.id : null,
  }).in('id', [...selectedIds]);
  ```
- Após sucesso: `toast.success`, `clearSelection()`, `refetch()`.
- Reusar o padrão de `AlertDialog` já presente para exclusão em massa.

**RLS / Banco:** nenhuma mudança necessária. A política `Admins can update all orders` já permite o update em lote, e o admin_master é admin.

**Sem alteração** em `OrderCard`, `OrderDetailPage` ou outros arquivos — o checkbox individual continua funcionando normalmente e a tag "CONFERIDO" já é exibida no card pelo `showConferidoTag`.

## Fora do escopo

- Não cria histórico/log da marcação em massa (mantém o comportamento atual da marcação individual, que também não registra em `historico`).
- Não muda visibilidade da tag para outros papéis.
