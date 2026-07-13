## Ajustes solicitados

### 1. Dialog do QR (olhinho) — "auto-escaneado"

Arquivo: `src/components/ficha/VariacaoFotoIcon.tsx`

- Manter o QR renderizado como fundo.
- Adicionar sobre o QR um "botão Escanear" no centro que fica sempre no estado apertado e invisível (opacity 0 / sr-only), disparando automaticamente a renderização da foto por cima do QR ao abrir.
- Efeito visual final: usuário abre → vê a foto renderizada em cima do QR (o "scanner" é o próprio `<img>` overlay). Se a foto falhar (`onError`), o botão continua invisível mas o QR fica visível como fallback.
- Mesma lógica replicada dentro de `VariacaoExpandirDialog` nos cards.

### 2. Dialog "Expandir" (multi-seleção de bordados/laser/etc)

Arquivo: `src/components/ficha/VariacaoExpandirDialog.tsx`

- **Busca por nome**: adicionar `<Input>` no topo (`Pesquisar bordado…`) que filtra `items` por substring case-insensitive. Ao digitar, reseta `page` para 0.
- **Grid responsivo**:
  - Desktop (`sm:` ≥640px): 3 colunas × 2 linhas = **6 por página**.
  - Mobile: 1 coluna × 2 linhas = **2 por página**.
  - Constante `PAGE_SIZE` vira dinâmica via `useIsMobile()` (hook já existente `use-mobile.tsx`): 2 no mobile, 6 no desktop.
- **QR + foto auto-escaneada** em cada card (mesma técnica do item 1).
- Paginação continua igual (anterior / X de Y / próxima), mas recalculada sobre a lista filtrada.

### 3. Edição de preços de variações nos produtos extras

Arquivos: `src/components/extras/ExtraProdutoEditPopover.tsx` (principal), possivelmente `src/lib/extraProductSchema.ts` para expor os grupos editáveis.

Hoje o popover só permite editar nome/preço base. Precisamos permitir editar o **preço unitário** das variações internas dos produtos cujo `EXTRA_SCHEMA` referencia `source: 'variacoes'`.

Casos alvo citados pelo usuário:
- **Kit Canivete** e **Kit Faca**: hoje `EXTRA_SCHEMA` deles usa `source: 'shared'` para Tipo/Cor de couro (herdado da ficha, não editável no card — manter como está). A opção nova é o campo **"Vai o canivete?" / "Vai a faca?"** (Sim/Não). Esses valores ainda não existem no schema como variação editável. Adicionar no `EXTRA_SCHEMA`:
  - `kit_canivete`: campo `{ key: 'vaiCanivete', label: 'Vai o canivete?', kind: 'select', source: 'variacoes', group: 'vai_canivete' }` com opções `Sim` / `Não` e preço editável (fallback R$ 30 para "Sim", R$ 0 para "Não").
  - `kit_faca`: mesma coisa (`vaiFaca` / `vai_faca`, fallback R$ 35).
  - Ajustar o formulário do ExtraCard para ler essas variações via `getExtraOptionsFromDB` (já existe).
- **Desmanchar**: já tem campos `qual_sola` e `troca_gaspea` em `EXTRA_SCHEMA` como `source: 'variacoes'`. Basta expor a edição no popover.

**Mudança no popover (todos os extras com `source: 'variacoes'`)**:
- Para cada campo do schema desse tipo, renderizar uma seção "Variações do campo X" com:
  - Lista de itens atuais (nome + input `R$`) editáveis inline.
  - Botão **"+ variação"** para adicionar novo (nome + preço).
  - Botão excluir (🗑) por linha.
- Ao salvar, montar novo objeto `variacoes` combinando os grupos existentes + os editados e chamar `updateExtra.mutateAsync({ id, variacoes: novoObj })` (`useUpdateExtraProduto` já aceita `variacoes` no patch).
- Para Kit Canivete/Faca, permitir editar o preço de "Sim" e "Não" no grupo `vai_canivete`/`vai_faca`. Para Desmanchar, permitir editar preços de cada sola em `qual_sola` e de Sim/Não em `troca_gaspea`.

Fora de escopo: mexer nos campos herdados de Ficha (`Tipo de couro`/`Cor do couro` do Kit Canivete/Faca continuam sendo editados em Configurações > Ficha da Bota, como já indicado no popover).

### Arquivos afetados

- `src/components/ficha/VariacaoFotoIcon.tsx` (botão escanear invisível auto-ativo)
- `src/components/ficha/VariacaoExpandirDialog.tsx` (busca + grid 6/2 responsivo + auto-scan nos cards)
- `src/components/extras/ExtraProdutoEditPopover.tsx` (editor de variações + preços por grupo)
- `src/lib/extraProductSchema.ts` (novos campos `vai_canivete` / `vai_faca` e helpers)
- Onde o formulário de compra do Kit Canivete/Faca é renderizado (verificar `ExtrasPage.tsx` / `EstoqueBuyDialog.tsx` para adicionar o novo select "Vai o canivete/faca?" lendo do DB)

Sem migração de banco — tudo cabe no JSONB `extra_produtos.variacoes` que já existe.
