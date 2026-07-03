## Objetivo
Na página **Modelos**, adicionar um botão com ícone de olho ao lado do botão "Comprar" de cada card. Ao clicar, abre um modal mostrando a **foto em tamanho maior** e o **nome completo** do modelo (sem quebra/limite de linhas), apenas para visualização.

## Alterações — `src/pages/ModelosPage.tsx`

1. **Import**: adicionar `Eye` em `lucide-react`.

2. **`TemplateCard`**: aceitar nova prop `onVisualizar` e trocar o botão único "Comprar" por uma linha com dois botões lado a lado:
   - `Comprar` (mantém `flex-1`, cor primária).
   - Botão outline quadrado (`h-9 w-9`, ícone `<Eye />`, `title="Visualizar modelo"`), que dispara `onVisualizar`.

3. **Estado do modal de visualização** no componente `ModelosPage`:
   - `visualizarModelo: ModeloRow | null` + `visualizarOpen: boolean`.
   - Passar `onVisualizar={() => { setVisualizarModelo(m); setVisualizarOpen(true); }}` ao `TemplateCard`.

4. **Modal de visualização** (novo `<Dialog>`):
   - `DialogContent` com `max-w-2xl`.
   - Foto grande: container `w-full aspect-square sm:aspect-[4/3] bg-background` com `<img className="w-full h-full object-contain" />` (mesma resolução de URL/Drive já usada). Fallback com `ImageOff` se erro.
   - Abaixo: `<DialogTitle>` (ou `<h2>`) com o **nome completo**, sem `line-clamp`, `text-center`, `text-base sm:text-lg font-semibold break-words`.
   - Sem outras informações (tipo, SKU, tamanhos, etc.) — só foto + nome, conforme pedido.

## Fora de escopo
- Não altera o fluxo do botão "Comprar".
- Não altera dados, filtros, paginação nem cards em outras páginas (TemplatesDialog etc.).
