# Limpar sem confirmação, atalho Ctrl+X correto e menu por teclado

## 1. Limpar sem confirmação

O botão "Limpar" e o atalho Ctrl + L passam a limpar a ficha direto, sem a caixa de confirmação do navegador. Continua aparecendo o aviso curto "Ficha limpa." no canto.

## 2. Texto do atalho Ctrl + X

Na lista de atalhos, "Limpar seleção do campo múltiplo" passa a ser "Expandir campo de múltipla seleção" — que é o que a tecla realmente faz (abre o pop-up de variações com fotos quando o foco está na busca do campo múltiplo).

## 3. Ctrl + M: escolher categoria e cair no primeiro campo dela

- Ctrl + M leva o foco para o menu de categorias, já destacando a primeira categoria.
- Setas para cima/baixo percorrem as categorias.
- Enter rola a página até a categoria escolhida e devolve o foco para a ficha, já posicionado no primeiro campo daquela categoria (seguindo a mesma regra do Enter: campo de seleção abre a lista ao receber foco).
- Esc sai do menu sem mudar nada.
- Clicar com o mouse continua funcionando igual, e também passa a focar o primeiro campo da categoria.

## Detalhes técnicos

- `src/pages/OrderPage.tsx`: remover os dois `window.confirm` de limpar (botão e Ctrl+L); ajustar o texto de Ctrl+X em `atalhosItens`; no handler de Ctrl+M, focar o primeiro botão do menu em vez do container.
- `src/components/ficha/FichaCategoriaMenu.tsx`: botões passam a ter roving focus (setas ↑/↓, Enter confirma, Esc devolve o foco à ficha). Após `scrollIntoView`, chamar um novo helper.
- `src/lib/fichaNav.ts`: novo `focusFirstInSection(sectionEl)` que reutiliza a lógica de `focusFirst` limitada ao elemento da seção (respeitando `data-ficha-nav` e campos puláveis).
