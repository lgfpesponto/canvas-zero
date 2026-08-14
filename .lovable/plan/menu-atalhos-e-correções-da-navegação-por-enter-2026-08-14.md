# Menu, Atalhos e correções da navegação por Enter

Duas frentes na ficha do "Faça seu pedido": reorganizar os botões de Menu/Atalhos e consertar a navegação por teclado.

## Parte 1 — Menu e Atalhos

1. **Nome "Menu"**: o título "FICHA" do menu lateral (desktop) e o botão "Categorias da ficha" (mobile) passam a se chamar **"Menu"**.

2. **Atalhos vira botão**: o painel de atalhos sai de dentro da ficha. No desktop aparece um botão **"Atalhos"** logo abaixo do menu de categorias, na coluna da esquerda; clicando, abre/fecha a lista de atalhos e o que cada um faz.

3. **Texto removido**: sai o parágrafo "Enter avança para o próximo campo. Nos campos de seleção... clique fora (ou Tab) para seguir." A linha "Enter — Avança para o próximo campo" continua na lista de atalhos.

4. **Mobile**: todos os botões acima da ficha, fora dela, em grade de 2 por linha, nesta ordem:

```text
Atalhos        | Limpar
Criar Modelo   | Modelos
Menu           | Trocar para Cinto
```

"Menu" e "Atalhos" abrem seus painéis logo abaixo da grade de botões.

## Parte 2 — Navegação por Enter

Quatro problemas: Enter não avança, o campo do link da foto não vem focado, os campos de variação não abrem a lista ao receberem o foco, e o campo "Tem / Não tem" prende o foco.

### Diagnóstico (a confirmar no primeiro passo)

A navegação hoje é um único listener de `keydown` no `<form>`, em fase de bolha. Isso tem duas consequências prováveis:

- Radix (Popover do select, Command) e o select nativo tratam o Enter antes e, em vários casos, param a propagação — então o listener do form nunca roda e o foco fica parado no mesmo campo. É o que bate com "fica só nele".
- O foco inicial usa um `setTimeout` fixo de 250 ms; como as variações vêm do banco, os campos ainda não existem nesse instante e o `focusFirst` não acha nada — o link da foto fica sem foco.

Primeiro passo da implementação: confirmar as duas hipóteses com log temporário no listener antes de aplicar as correções.

### Correções

1. **Enter capturado antes dos componentes**: o listener do form escuta em fase de captura, decide conforme o tipo do campo e só então deixa (ou não) o evento seguir. Funciona igual em input de texto, select de variação, "Tem / Não tem" e campos numéricos.
2. **Link da foto focado ao abrir**: em vez de tempo fixo, a ficha espera os campos existirem e foca o primeiro assim que ele aparece, com limite de tempo.
3. **Campo de variação abre a lista ao receber o foco**: a abertura passa a ser um comando explícito de quem move o foco ("foca e abre"). Chegando pelo Enter a lista abre com a busca pronta; setas navegam, Enter escolhe, fecha e avança. Mouse e clique fora também avançam. Abrir por clique direto continua sem avançar sozinho.
4. **"Tem / Não tem" não prende o foco**: Enter abre as opções; com as opções abertas, Enter confirma; com o campo resolvido, Enter avança. Marcando "Tem" com campo de descrição, o Enter leva primeiro para a descrição.
5. **Ordem de avanço** calculada pela posição visual real, para não pular de linha em blocos com colunas.

Nada de preço, validação ou regra de pedido muda. As correções valem também para cinto, extras e a compra embarcada em Modelos, que usam o mesmo hook.

## Detalhes técnicos

- `FichaCategoriaMenu.tsx`: label "Ficha" → "Menu"; no mobile o botão deixa de renderizar a própria barra e passa a ser controlado pela página (`aberto`/`onToggle`), para a ordem dos botões ficar em `OrderPage`.
- `FichaAtalhosPanel.tsx`: remove o parágrafo explicativo e vira colapsável (botão "Atalhos" + conteúdo), reutilizado no desktop e no mobile.
- `OrderPage.tsx`: `<FichaAtalhosPanel>` sai do `<form>` e vai para a coluna esquerda no desktop; no mobile, barra de ações em `grid grid-cols-2 gap-2` na ordem pedida, com o cabeçalho atual virando `hidden lg:flex`.
- `useFichaKeyboardNav.ts`: listener em `capture`, roteamento por tipo de campo (`input`, `select` nativo, `[data-ficha-nav="true"]`) com `preventDefault`/`stopPropagation` seletivos; troca do `setTimeout(250)` por `MutationObserver` + retry curto.
- `fichaNav.ts`: `getNavElements` ordena por `getBoundingClientRect()` (top, depois left); `focusNextFrom` dispara evento custom `ficha:focus-open` no destino; `scrollIntoView` sem `smooth`.
- `SearchableSelect.tsx`: remove abertura via `onFocus`, escuta `ficha:focus-open` no trigger, trata `Enter` no trigger (abre) e mantém `advanceOnSelect`; remove o `bloqueiaAberturaRef` por timeout.
- `ToggleField` em `OrderPage.tsx`: `<select>` nativo com handler próprio de `Enter` (abre / confirma / avança, indo antes para a descrição quando "Tem").
- `MultiSelect` mantém o comportamento atual (Enter marca, setas movem, Tab/clique fora segue).
