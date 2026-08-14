# Remover o "0" cinza dos campos de quantidade

Nos cards de tamanho da compra de estoque ainda aparece um `0` cinza (placeholder) dentro do campo.

## Mudança

- Remover o placeholder: o campo fica totalmente vazio até o vendedor digitar.

## Detalhe técnico

`src/components/estoque/EstoqueBuyDialog.tsx`: remover `placeholder="0"` do Input de quantidade por tamanho. O restante da lógica permanece igual.
