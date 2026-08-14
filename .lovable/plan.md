# Enter no campo Vendedor e seta para a descrição do "Tem"

## 1. Vendedor volta a abrir a lista

O campo Vendedor já vem preenchido com o nome do próprio admin, e a regra de "pular campos já preenchidos" está fazendo o Enter do link da foto atravessar o Vendedor direto para o número do pedido — por isso a lista não abre mais.

O Vendedor passa a ser sempre visitado pelo Enter, mesmo já preenchido: o foco para nele e a lista de vendedores abre para trocar (setas escolhem, Enter confirma e segue).

## 2. Seta para o lado leva à descrição nos campos "Tem / Não tem"

Com "Tem" selecionado e existindo campo de descrição:

- Seta para o lado (direita) leva o foco direto para o campo de descrição.
- Estando na descrição, Enter segue para o próximo campo da ficha.

O restante da regra continua igual: primeiro Enter abre as opções, segundo confirma, "Não tem" segue direto.

Nenhuma regra de preço, validação ou cálculo muda.

## Detalhes técnicos

- `src/pages/OrderPage.tsx`: o `<select>` de Vendedor recebe `data-ficha-filled="false"` para nunca ser pulado por `isNavFilled` (que já dá prioridade a esse atributo).
- `ToggleField` em `OrderPage.tsx`: novo tratamento de `ArrowRight` no `<select>` — quando o valor é "Tem" e existe `input[data-toggle-desc="true"]`, foca e seleciona a descrição (`preventDefault`/`stopPropagation`); Enter na descrição continua caindo no `focusNextFrom` do hook global.
