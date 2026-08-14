# Campo de quantidade vazio na compra de estoque

Hoje, ao abrir "Comprar do Estoque", cada tamanho já vem com `0` digitado no campo, e o vendedor precisa apagar antes de digitar a quantidade.

## Mudança

- Campo de quantidade por tamanho passa a aparecer **vazio**, com `0` apenas como placeholder cinza (dica visual).
- Ao digitar, o valor funciona igual a hoje (respeitando o máximo disponível e a reserva de outros vendedores).
- Apagar o conteúdo volta o campo a vazio e conta como quantidade zero no total.

## Detalhes técnicos

Arquivo: `src/components/estoque/EstoqueBuyDialog.tsx`

- Input do tamanho: `value={quantidades[t.id] ? String(quantidades[t.id]) : ''}` e `placeholder="0"`.
- `setQtd`: quando `raw` for string vazia, remover a chave do estado (ou setar 0) sem forçar exibição de `0`.
- Restante da lógica (validação de disponibilidade, total, montagem dos itens) permanece inalterada.
