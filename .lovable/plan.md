

## Plano: Corrigir lapis de edicao e ordenar variacoes alfabeticamente

### Problemas

1. **Lapis nao responde ao clique**: O botao do lapis na linha 1140 tem area de clique muito pequena (icone de 13px sem padding). Alem disso, o componente `SearchableSelect` (usado em campos `selecao`) pode criar uma camada invisivel que bloqueia cliques nos botoes vizinhos.

2. **Variacoes sem ordem alfabetica**: No `BootFieldRenderer`, as variacoes (`activeVars`) nao sao ordenadas. Na `CategoriaSection` (fichas dinamicas) ja existe `sortAlpha` (linha 1443), mas o `BootFieldRenderer` nao aplica nenhuma ordenacao.

### Alteracoes

**Arquivo: `src/pages/AdminConfigFichaPage.tsx`**

1. **Aumentar area de clique do lapis** (~linha 1140):
   - Adicionar `p-1.5 rounded hover:bg-muted relative z-10` ao botao do lapis do `renderLabel`
   - Aplicar o mesmo aos botoes Plus e Pencil do `adminControls` (~linhas 1199-1201)

2. **Ordenar `activeVars` alfabeticamente** (~linha 1041):
   - Trocar `const activeVars = variacoes.filter(v => v.ativo !== false);` por:
   ```
   const activeVars = variacoes
     .filter(v => v.ativo !== false)
     .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
   ```
   - Manter "Bordado Variado" ao final da lista (como ja e feito no formulario publicado)

3. **Ordenar variacoes no painel de edicao** (~linha 1288):
   - Ordenar `Object.entries(editState)` alfabeticamente ao renderizar a lista de edicao no Dialog

4. **Ordenar opcoes no `SearchableSelect`** do tipo `selecao` (~linha 1225):
   - Ordenar o array `options` alfabeticamente antes de passar ao componente

