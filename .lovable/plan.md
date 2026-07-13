## Ajustes no modo edição inline da ficha

### 1. Remover botão duplicado "editar ficha"
Em `OrderPage.tsx` (linha 1631), `BeltOrderPage.tsx` (658) e `DynamicOrderPage.tsx` (217), remover `<EditFichaButton …/>` mantendo apenas `<FichaEditToggle />`. Também remover o import de `EditFichaButton` nesses 3 arquivos.

### 2. Adicionar variação inline (sem `window.prompt`)
Em `FichaFieldControls.tsx`:
- Substituir os dois `handleQuickAdd` / `handleAddVar` (que usam `window.prompt`) por inserção de uma **linha nova em branco** direto na lista do popover — inputs de nome + preço já editáveis + botão "ok" para salvar (mesma UI do `VarLine` em modo `editing`).
- No popover principal (✏️), o clique em "+ variação" adiciona um item local em estado `draftVars` renderizado no topo da lista; ao confirmar, chama `insertVar.mutateAsync` e limpa o draft.
- O ➕ inline (fora do popover) passa a **abrir o popover já com uma linha draft nova**, em vez de disparar `prompt`.

### 3. Popover não mostra valores atuais ao editar
Investigar e corrigir em `EditPopover`:
- `obrigatorio`: o `useEffect` depende de `campo?.obrigatorio` mas o valor inicial usa `!!campo?.obrigatorio` na 1ª render. Garantir sincronização quando `campo` chega assincronamente (react-query) — usar `campo?.id` como key do popover ou resetar states no `onOpenChange(true)` lendo `campo` fresh.
- Checkbox price ("Tem/Não tem"): mesmo problema — ler `campo.opcoes[0].preco_adicional` no abrir. Adicionar log e conferir se o schema salva em `opcoes` (array) mesmo — pode estar salvando como `opcoes: [{label,preco_adicional}]` mas leitura tratando `preco_adicional` como string. Fazer `Number(...) || 0` robusto.
- Nome: idem — reler no open.

Correção: converter states para função de reset chamada em `onOpenChange` quando abre, garantindo sempre valores do banco.

### 4. Metais editáveis (nome + preço)
Atualmente Strass / Bola Grande / Cruz / Bridão / Cavalo usam constantes hardcoded (`STRASS_PRECO` etc.) em `OrderPage.tsx`. Para permitir edição inline:
- Adicionar entradas em `labelSlugMap.ts` para bota: `strass`, `bola_grande`, `cruz_metal`, `bridao_metal`, `cavalo_metal` (categoria `metais`, tipo `checkbox` com preço unitário no `opcoes[0].preco_adicional`).
- Envolver os labels em `OrderPage.tsx` (linhas ~1941–1945) com `<FichaFieldControls labelText="Strass" defaultTipo="checkbox" defaultCategoriaSlug="metais" />`.
- Ler o preço via `useFichaVariacoesLookup` / `ficha_campos.opcoes` com fallback para a constante antiga, para não quebrar pedidos existentes até a ficha ter os campos criados.

### 5. "Tipo do Metal" editável + adicionar novos
O select "Tipo do Metal" (label linha 1919) precisa receber `<FichaFieldControls labelText="Tipo do Metal" defaultTipo="multipla" defaultCategoriaSlug="metais" />`. As opções renderizadas (hoje hardcoded) devem passar a ler de `ficha_variacoes` (categoria/campo `tipo_metal`) com merge sobre a lista hardcoded para retro-compatibilidade. Novas variações criadas via popover aparecem imediatamente na lista.

### Arquivos afetados
- `src/pages/OrderPage.tsx` — remover botão duplicado, wrappar metais, ler preços via lookup
- `src/pages/BeltOrderPage.tsx` — remover botão duplicado
- `src/pages/DynamicOrderPage.tsx` — remover botão duplicado
- `src/components/ficha-edit/FichaFieldControls.tsx` — remover prompts, adicionar draft rows inline, corrigir hydratação de estado ao abrir popover
- `src/components/ficha-edit/labelSlugMap.ts` — adicionar slugs dos metais

### Fora de escopo
- Nenhuma mudança em lógica de preço final / recompute — apenas leitura passa a ter fallback ao banco.
- Sem mudança em migrations (campos são criados on-demand pelo popover, como já funciona).
