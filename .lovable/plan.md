# Menu e Atalhos como botões fora da ficha

## O que muda

1. **Nome "Menu"**: o título "FICHA" do menu lateral (desktop) e o botão "Categorias da ficha" (mobile) passam a se chamar **"Menu"**.

2. **Atalhos vira botão**: o painel de atalhos sai de dentro da ficha. No desktop, aparece um botão **"Atalhos"** logo abaixo do menu de categorias (coluna esquerda); clicando, abre/fecha a lista de atalhos e o que cada um faz.

3. **Texto removido**: sai o parágrafo "Enter avança para o próximo campo. Nos campos de seleção... clique fora (ou Tab) para seguir." A linha "Enter — Avança para o próximo campo" continua na lista de atalhos.

4. **Mobile**: os botões ficam todos acima da ficha, fora dela, em grade de 2 por linha, nesta ordem:

```text
Atalhos        | Limpar
Criar Modelo   | Modelos
Menu           | Trocar para Cinto
```

Tanto "Menu" quanto "Atalhos" abrem seus painéis logo abaixo da grade de botões.

## Detalhes técnicos

- `FichaCategoriaMenu.tsx`: label "Ficha" → "Menu"; no mobile o botão deixa de renderizar sua própria barra e passa a ser controlado pela página (props opcionais `aberto`/`onToggle` + render só do painel), para que a ordem dos botões seja definida em `OrderPage`.
- `FichaAtalhosPanel.tsx`: remove o parágrafo explicativo e ganha modo colapsável (botão "Atalhos" + conteúdo), com o mesmo conteúdo usado no desktop e no mobile.
- `OrderPage.tsx`: move `<FichaAtalhosPanel>` de dentro do `<form>` para a coluna esquerda (abaixo de `FichaCategoriaMenu`) no desktop; no mobile renderiza a barra de ações em `grid grid-cols-2 gap-2` com a ordem pedida, e o cabeçalho atual de botões passa a ser `hidden lg:flex`. Nenhuma lógica de pedido, preço ou atalho de teclado muda.
