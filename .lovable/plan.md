# Enter marcando variações e sugestão de cor na ordem certa

Três ajustes na ficha do "Faça seu pedido" (`/pedido`). Nenhuma regra de preço muda.

## 1. Enter marca a variação nos campos de múltipla seleção

Hoje, ao navegar pelas opções de Bordado/Laser/Acessórios com as setas, o Enter em cima de uma opção pula para o próximo campo em vez de marcar. Isso acontece porque o atalho global de navegação da ficha captura o Enter antes da opção.

Passa a funcionar assim:
- Enter em cima de uma opção **marca/desmarca** aquela opção e o foco continua nela.
- Setas continuam movendo entre as opções sem marcar.
- Para sair do campo: seta depois da última opção, Tab ou clique fora.

## 2. Teclado dentro do "expandir"

O pop-up de expandir (com fotos) passa a ter navegação por teclado:
- Ao abrir, a primeira variação da página fica focada (busca continua acessível).
- Setas (esquerda/direita/cima/baixo) andam pelas variações; ao passar da última/primeira, muda de página automaticamente.
- Enter marca/desmarca a variação focada.
- Esc fecha, como já fecha hoje.

## 3. Sugestão de cor de bordado/laser na ordem "tem → cor"

Hoje a cor só é espelhada para as partes que **já estavam marcadas** no momento em que a cor foi digitada. Se o usuário preenche cano (bordado + cor) e só depois marca o bordado da gáspea, a cor da gáspea abre vazia.

Passa a ser:
- A última cor informada em cada categoria (Bordado, Laser, Recortes) fica guardada.
- Quando uma nova parte da mesma categoria é marcada como "tem" e seu campo de cor aparece vazio, ele já vem pré-preenchido com essa cor, com a etiqueta "Sugerido".
- O valor sugerido continua editável e, ao ser alterado, deixa de ser sugestão (e passa a ser a nova referência da categoria).

## Detalhes técnicos

- `src/hooks/useFichaKeyboardNav.ts`: ignorar o Enter quando o alvo estiver dentro de `[data-ms-opt="true"]` ou do diálogo de expandir, deixando o `onKeyDown` do `MultiSelect` tratar (hoje só há exceção para `data-ficha-enter-manual`).
- `src/pages/OrderPage.tsx` (`MultiSelect`): manter foco na opção após o toggle (não avançar no Enter).
- `src/components/ficha/VariacaoExpandirDialog.tsx`: opções ganham `tabIndex={-1}` + roving focus, handler de setas com virada de página (`setPage`) e Enter chamando `onToggle`; autofoco na primeira opção ao abrir/trocar de página.
- `src/pages/OrderPage.tsx`: novo estado `ultimaCorGrupo: Record<CorGrupo, string>` alimentado por `handleCorGrupo`; efeito que, ao uma parte passar a `ativo` com valor vazio, aplica a cor guardada e marca `corSug[key] = true`.
