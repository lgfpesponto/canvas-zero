# Corrigir a navegação por Enter na ficha

Quatro problemas relatados: Enter não avança, o campo do link da foto não vem focado, os campos de variação não abrem a lista ao receberem o foco, e o campo "Tem / Não tem" prende o foco.

## Diagnóstico (a confirmar no primeiro passo)

A navegação hoje é um único listener de `keydown` no `<form>`, em fase de bolha (`useFichaKeyboardNav`). Isso tem duas consequências prováveis:

- O Radix (Popover do select, Command, Select nativo) trata o Enter antes e, em vários casos, para a propagação — então o listener do form nunca roda e o foco fica parado no mesmo campo. É o que bate com "fica só nele".
- O foco inicial usa um `setTimeout` fixo de 250 ms; como as variações da ficha vêm do banco, os campos ainda não existem nesse instante e o `focusFirst` não acha nada — o link da foto fica sem foco.

Primeiro passo da implementação: confirmar as duas hipóteses com log temporário no listener (se o evento chega e qual é o alvo) antes de aplicar as correções abaixo.

## Correções

1. **Enter passa a ser capturado antes dos componentes**: o listener do form escuta em fase de captura, decide o que fazer conforme o tipo do campo e só então deixa (ou não) o evento seguir. Assim o Enter funciona igual em input de texto, select de variação, "Tem / Não tem" e campos numéricos.

2. **Link da foto focado ao abrir**: em vez de um tempo fixo, a ficha espera os campos existirem (observa o formulário e tenta focar até achar o primeiro campo), com um limite de tempo. Sem foco roubado depois que as variações carregam.

3. **Campo de variação abre a lista ao receber o foco**: a abertura deixa de depender do evento de foco do botão e passa a ser um comando explícito de quem move o foco ("foca e abre"). Ao chegar pelo Enter, a lista abre com a busca pronta; navegar com as setas e confirmar com Enter escolhe a opção, fecha e avança. Escolher com o mouse ou clicar fora também avança. Abrir com clique direto continua sem avançar sozinho.

4. **"Tem / Não tem" não prende mais o foco**: Enter no campo abre as opções; com as opções abertas, Enter confirma a destacada; com o campo já resolvido, Enter avança. Se marcar "Tem" e existir campo de descrição, o Enter leva primeiro para a descrição e depois segue.

5. **Ordem de avanço**: o próximo campo passa a ser calculado pela ordem visual real (posição na página) e não só pela ordem do DOM, para não "pular de linha" em blocos com colunas.

Nada de preço, validação ou regra de pedido muda — só o comportamento de foco/teclado. As mesmas correções valem para a ficha de cinto, extras e a compra embarcada em Modelos, que usam o mesmo hook.

## Detalhes técnicos

- `src/hooks/useFichaKeyboardNav.ts`: listener em `capture`, com roteamento por tipo de campo (`input`, `select` nativo, `[data-ficha-nav="true"]`) e `preventDefault`/`stopPropagation` seletivos; substituir o `setTimeout(250)` por `MutationObserver` + retry curto até o primeiro campo aparecer.
- `src/lib/fichaNav.ts`: `getNavElements` ordena por `getBoundingClientRect()` (top, depois left) e `focusNextFrom` dispara um evento custom `ficha:focus-open` no destino, para que selects saibam abrir; `scrollIntoView` sem `smooth` para não competir com o foco.
- `src/components/SearchableSelect.tsx`: remove a abertura via `onFocus`; escuta o evento `ficha:focus-open` no trigger para abrir programaticamente; trata `Enter` no trigger (abre) e mantém `advanceOnSelect` no `onSelect`/fechamento por clique fora. Remove o `bloqueiaAberturaRef` baseado em timeout.
- `ToggleField` em `src/pages/OrderPage.tsx`: o `<select>` nativo ganha handler próprio de `Enter` (abre / confirma / avança, indo antes para o input de descrição quando "Tem").
- `MultiSelect` mantém o comportamento atual (Enter marca, setas movem, Tab/clique fora segue).
