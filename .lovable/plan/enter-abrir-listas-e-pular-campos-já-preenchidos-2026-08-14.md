# Enter: abrir listas e pular campos já preenchidos

Ajustes na navegação por Enter da ficha do "Faça seu pedido".

## 1. Campo Vendedor abre a lista

O campo Vendedor (admin master e admin produção) é uma lista nativa do navegador, que hoje só recebe o foco — a lista não abre. Passa a abrir a lista de vendedores assim que o Enter do link da foto levar o foco até ele. Com a lista aberta: setas escolhem, Enter confirma e o foco segue para o próximo campo.

## 2. Enter pula campos já preenchidos

Ao avançar com Enter, o foco vai para o próximo campo **ainda vazio** na ordem visual da ficha. Se o número do pedido já veio preenchido automaticamente (ou o vendedor já está definido, ou qualquer campo seguinte já tem valor), o Enter passa direto para o próximo campo vazio, atravessando categorias.

O foco nunca fica em lugar nenhum: se não houver mais campo vazio à frente, o foco vai para o próximo campo na sequência (mesmo preenchido), para dar sempre continuidade.

## 3. Campos "Tem / Não tem"

Sequência com Enter:

1. Primeiro Enter: abre as opções (Tem / Não tem).
2. Setas escolhem; segundo Enter confirma a opção.
3. Se ficou "Não tem": segue direto para o próximo campo.
4. Se ficou "Tem" e existe campo de descrição: o foco vai para a descrição; o Enter seguinte segue para o próximo campo.
5. Se ficou "Tem" e não existe descrição: segue direto para o próximo campo.

Nenhuma regra de preço, validação ou cálculo muda.

## Detalhes técnicos

- `useFichaKeyboardNav.ts`: no ramo de `SELECT` nativo, primeiro Enter chama `showPicker()` no elemento (com fallback para o comportamento atual quando o navegador não suporta) e marca o campo como "aberto" via `data-ficha-open`; o Enter seguinte limpa a marca e delega o avanço.
- `ToggleField` em `OrderPage.tsx`: mesma máquina de estados (abrir → confirmar → descrição/próximo), usando `showPicker()` no primeiro Enter em vez de apenas registrar a confirmação; `onChange`/`onBlur` continuam resetando o estado.
- `fichaNav.ts`: `focusNextFrom` ganha a regra de pular campos preenchidos — considera preenchido `input`/`textarea` com `value` não vazio, `select` com valor diferente de vazio, e combobox com `data-ficha-filled="true"` / texto de valor selecionado. Se todos os seguintes estiverem preenchidos, cai no próximo imediato (comportamento atual).
- O campo Vendedor recebe os mesmos atributos de navegação dos demais campos para entrar na ordem visual.
