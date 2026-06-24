## Mudança

No `BordadoPortalPage.tsx` (linhas ~534-554), o input do scanner está em tema escuro (`bg-gray-800`, borda `gray-600`, texto branco) — destoa do resto e fica "feio". Deixar igual ao do Montagem: card branco com borda e fundo verde claro, label em verde escuro, input branco com borda esmeralda grossa, fonte mono em negrito.

### `src/pages/BordadoPortalPage.tsx`
Envolver o input num bloco `rounded-lg border-2 border-emerald-500 bg-emerald-50 p-3` (modo baixa) ou `border-amber-500 bg-amber-50` (modo entrada), com um `<label>` curto acima ("Leia o código de barras do pedido"). O `<input>` passa a ser branco (`bg-white`), borda esmeralda/âmbar 2px que escurece no foco, fonte `font-mono font-bold text-lg`, padding `px-3 py-3`. Ícone do scanner e botões abaixo permanecem como estão.

Sem mudar funcionalidade — só estilo/markup do bloco do input. O modo dual (baixa esmeralda / entrada âmbar) é preservado.
