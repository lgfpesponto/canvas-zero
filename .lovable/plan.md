

## Plano: Corrigir "+ campo" e "+ categoria" na ficha de Bota

### Problemas identificados

1. **"+ campo" - categorias no dropdown**: O dropdown de categorias ja usa `categorias` do banco, que tem 30 categorias. Funciona tecnicamente, mas apos adicionar uma variacao, o query `ficha_variacoes_all` nao e invalidado, entao o novo item nao aparece na tela.

2. **"+ categoria" - nao aparece na ficha**: O `handleAddCategoria` insere a categoria no banco corretamente, mas o `BootFormLayout` tem **17 secoes hardcoded** (indices 0-16). Categorias novas nao tem uma secao correspondente, entao nunca aparecem na visualizacao.

3. **`handleAddItem` nao passa `relacionamento`**: A variavel `relacionamento` e calculada mas nao incluida no payload do `insertVariacaoMut.mutate`.

4. **`sectionOrder` fixo em 17**: `BOOT_SECTION_COUNT = 17` e `sectionOrder` e inicializado com indices 0-16. Novas categorias precisam gerar secoes dinamicas adicionais.

### Alteracoes em `src/pages/AdminConfigFichaPage.tsx`

**1. Renderizar categorias extras apos as 17 secoes fixas**

No `BootFormLayout`, apos as 17 secoes hardcoded, detectar categorias do banco que NAO tem slug mapeado nas secoes fixas (como "Teste", "top", "Preencher" que ja existem no banco). Para cada uma, renderizar uma secao generica com `AdminMultiSelect` ou `AdminSelectField` baseado no tipo, permitindo editar/renomear/apagar.

```text
allSections[0..16] = secoes fixas (hardcoded)
allSections[17+]   = categorias extras do banco (dinamicas)
```

**2. Atualizar `BOOT_SECTION_COUNT` e `sectionOrder`**

Em vez de fixo em 17, calcular como `17 + extraCategorias.length`. Atualizar `sectionOrder` quando `categorias` muda (via useEffect).

**3. Corrigir invalidacao de queries no `handleAddItem`**

Apos sucesso, invalidar tambem `ficha_variacoes_all` para que o novo item apareca:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['ficha_variacoes_all'] });
  // ... resto
}
```

**4. Passar `relacionamento` no payload do `handleAddItem`**

Incluir o campo `relacionamento` no objeto passado ao `insertVariacaoMut.mutate`.

**5. Filtrar categorias no dropdown do "+ campo"**

O dropdown ja mostra todas as categorias. Opcionalmente filtrar para mostrar apenas categorias relevantes (as que tem slug mapeado nas secoes + as extras).

### Resultado esperado

- "+ campo": dropdown mostra categorias existentes, ao adicionar o item aparece imediatamente na secao correspondente
- "+ categoria": ao criar uma nova categoria, ela aparece como uma nova secao no final da ficha, com possibilidade de adicionar variacoes, renomear e apagar

