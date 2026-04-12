

## Problema

1. **Itens do fallback nao editaveis**: O painel de edicao (lapis) so mostra variacoes que ja existem no banco (`variacoes`). Itens que vem do fallback e nao foram salvos no banco nao aparecem no painel de edicao -- portanto nao podem ser renomeados, removidos ou ter preco alterado.

2. **Categorias/subtitulos nao editaveis**: Os titulos das secoes (Couros, Bordados, Laser, etc.) e os labels dos campos (Tamanho, Modelo, etc.) nao tem opcao de edicao. O admin precisa poder renomear ou apagar categorias.

## Solucao

### 1. Tornar fallbacks editaveis no painel de edicao

Quando o admin clica no lapis, o `openEditPanel` precisa construir o `editState` combinando fallback + DB (mesmo merge que ja acontece na exibicao). Para cada item do fallback que nao existe no banco, mostrar com um indicador "(fallback)" e ao salvar, criar automaticamente como `ficha_variacoes` no banco. Assim todos os itens ficam editaveis.

**Alteracoes em `AdminEditableOptions`:**
- Receber `fallback` como prop (passado de `AdminSelectField` e `AdminMultiSelect`)
- No `openEditPanel`, construir lista merged (fallback base + DB override + DB extras) igual ao merge ja existente
- Cada item tera: `dbId` (se existe no banco) ou `null` (se e fallback puro)
- No `handleSaveAll`: itens com `dbId` fazem `updateVariacao`; itens sem `dbId` que foram editados fazem `insertVariacao` (criando no banco)
- Itens de fallback tambem podem ser marcados para exclusao (serao inseridos como `ativo: false`)

### 2. Lapis nas categorias/subtitulos para editar nome ou apagar

**Alteracoes no componente `Section`:**
- Adicionar props opcionais: `categoriaId`, `onRename`, `onDelete`
- Quando `categoriaId` existir, mostrar um icone de lapis ao lado do titulo
- Ao clicar no lapis, abrir um mini painel inline com input para renomear e botao para apagar a categoria
- Usar `useUpdateCategoria` para renomear e `useDeleteCategoria` para apagar

**Alteracoes no `BootFormLayout`:**
- Passar `categoriaId` e callbacks de rename/delete para cada `Section` que corresponde a uma categoria do banco

**Alteracoes em `AdminSelectField`:**
- Adicionar lapis ao lado do label do campo para permitir renomear o nome da categoria (slug permanece o mesmo)

### Arquivo alterado
- `src/pages/AdminConfigFichaPage.tsx` -- componentes `AdminEditableOptions`, `Section`, `AdminSelectField`, `AdminMultiSelect` e `BootFormLayout`

