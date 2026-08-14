# Enter no Tamanho e nos campos "Tem / Não tem"

## 1. "Gerar Grade" só para o vendedor de estoque

Hoje, na ficha do vendedor comum, o campo Tamanho vem acompanhado do botão "Gerar Grade" (e, quando não há tamanho escolhido, a área de grade toma o lugar do campo). Ao chegar nesse ponto pelo Enter, abre a janela de grade em vez da lista de tamanhos.

Passa a ser assim:

- Vendedor comum: só a lista de tamanhos. O Enter abre as variações de tamanho normalmente, escolhe e segue.
- Vendedor Estoque (e o perfil que só trabalha com grade): continua com "Gerar Grade" exatamente como está hoje.

## 2. Enter volta a passar pelos campos "Tem / Não tem"

Os campos "Tem / Não tem" começam sempre com "Não tem" selecionado, e a regra de pular campos já preenchidos está entendendo isso como preenchido — por isso o Enter passa direto por eles.

Eles voltam a entrar na sequência, com a regra já definida:

1. Primeiro Enter: abre as opções.
2. Setas escolhem; segundo Enter confirma.
3. "Não tem": segue para o próximo campo.
4. "Tem" com campo de descrição: vai para a descrição; Enter seguinte segue adiante.
5. "Tem" sem descrição: segue direto.

Nenhuma regra de preço, validação ou cálculo muda.

## Detalhes técnicos

- `src/pages/OrderPage.tsx`: no bloco do campo Tamanho, o botão "Gerar Grade" e o modo grade deixam de ser oferecidos quando `isVendedorComum` — a condição do bloco de grade fica restrita a `isAdmin && (vendedorSelecionado === 'Estoque' || 'Juliana Cristina Ribeiro')`; vendedor comum cai no `SelectField` de Tamanho como os demais.
- `src/lib/fichaNav.ts`: `isNavFilled` passa a respeitar `data-ficha-filled="false"` antes de qualquer checagem por tipo de elemento, e trata como "não preenchido" qualquer campo dentro de `[data-ficha-toggle="true"]`.
