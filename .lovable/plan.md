

## Problema

1. O badge "não salvo" deveria mostrar "salvo no banco" para itens que JA existem no banco, e nao mostrar nada ou mostrar um indicador diferente para itens de fallback. Atualmente o badge "não salvo" aparece nos itens de fallback mas o usuario quer que o texto seja diferente.

2. Falta um botao "Salvar no banco" no topo do modal de edicao que persista TODOS os itens de fallback de uma vez no banco de dados (bulk save), sem precisar editar um por um.

## Solucao

### 1. Trocar badge "não salvo" por indicador correto

- Itens de fallback (sem dbId): mostrar badge "não salvo" em amarelo (como esta)
- Itens do banco (com dbId): mostrar badge "salvo no banco" em verde
- Isso ja da clareza ao admin sobre o estado de cada item

### 2. Adicionar botao "Salvar tudo no banco" no header do modal

Na barra de acoes do modal (linha 396-403), adicionar um botao "Salvar no banco" que:
- Percorre todos os itens do `editState` que tem `isFallback: true`
- Insere cada um no banco via `insertVariacao` com `categoria_id`, `nome`, `preco_adicional` e `ordem: 0`
- Atualiza o `editState` para marcar como `isFallback: false` e preencher o `dbId`
- Mostra toast de sucesso e faz `refetch()`
- O botao so aparece se existir pelo menos 1 item com `isFallback: true`

### Arquivo alterado
- `src/pages/AdminConfigFichaPage.tsx` -- componente `AdminEditableOptions`:
  - Linha 396-403: adicionar botao "Salvar no banco" na barra de acoes
  - Linha 430: trocar badge para mostrar "salvo no banco" (verde) quando `!isFallback` e `dbId` existe, e "não salvo" (amarelo) quando `isFallback`
  - Nova funcao `handleSaveAllToDb` que faz bulk insert dos fallback items

