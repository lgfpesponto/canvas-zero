

## Problema

O formulário "Faça seu pedido" → Bota usa a função **hardcoded** `getCoresCouroFiltradas()` do arquivo `src/lib/orderFieldsConfig.ts` para filtrar cores de couro com base no tipo de couro. Essa função contém arrays fixos (`COURO_CORES_EXCLUSIVAS`, `CORES_RESTRITAS`) que nunca consultam o banco de dados.

Os relacionamentos salvos na admin (tabela `ficha_variacoes`, coluna `relacionamento`) simplesmente não são lidos pelo formulário de pedido para os campos de couro.

O mesmo vale para **todos os outros campos hardcoded**: Tamanho → Modelo, Modelo → Solado, Modelo → Formato do Bico, etc. Todos usam lógica fixa em `orderFieldsConfig.ts`.

## Solução

Criar um novo hook `useDynamicFieldFilter` que lê os relacionamentos do banco e substitui as funções hardcoded **apenas para filtragem de opções**. A lógica atual permanece como fallback caso o banco não tenha dados.

### Alterações

#### 1. Novo hook: `src/hooks/useDynamicFieldFilter.ts`
- Busca todas as variações ativas da ficha "bota" com seus relacionamentos e campo slugs
- Expõe uma função `getFilteredOptions(campoSlug, selections)` que:
  - Recebe o slug do campo que queremos filtrar (ex: `cor_couro_cano`)
  - Recebe as seleções atuais do formulário (ex: `{ couro_cano: "Nobuck" }`)
  - Percorre as variações dos campos selecionados, verifica se possuem relacionamento apontando para `cor_couro_cano`, e retorna apenas as opções permitidas
  - Se nenhum relacionamento for encontrado no banco, retorna `null` (sinalizando para usar o fallback hardcoded)

#### 2. Atualizar `src/pages/OrderPage.tsx`
- Importar o novo hook
- Para cada campo de cor do couro (cano, gáspea, taloneira), verificar se existe filtragem dinâmica do banco
- Se `getFilteredOptions` retornar resultado, usar esse resultado; senão, usar `getCoresCouroFiltradas()` como fallback
- Mesma lógica para os demais campos dependentes (modelo, solado, formato_bico, cor_sola, cor_vira)

#### 3. Atualizar `src/pages/EditOrderPage.tsx`
- Mesma lógica de fallback aplicada

### O que NÃO muda
- Nenhuma função existente é removida de `orderFieldsConfig.ts`
- Nenhum layout, campo ou fluxo do formulário é alterado
- Os arrays hardcoded continuam existindo como fallback
- A lógica de preços não é tocada
- O hook `useFichaVariacoesLookup` (usado para bordados/laser) permanece intacto

### Resultado esperado
Quando você editar um relacionamento na admin (ex: Nobuck → cores permitidas), sincronizar e recarregar o formulário de pedido, as opções de cor serão filtradas de acordo com o que foi definido no banco.

### Detalhes técnicos

O hook buscará:
```sql
SELECT fv.nome, fv.relacionamento, fc.slug as campo_slug
FROM ficha_variacoes fv
JOIN ficha_campos fc ON fv.campo_id = fc.id
WHERE fc.ficha_tipo_id = (SELECT id FROM ficha_tipos WHERE slug = 'bota')
AND fv.ativo = true AND fv.relacionamento IS NOT NULL
```

A função de filtragem:
```typescript
// Exemplo: usuário selecionou couro_cano = "Nobuck"
// O banco tem: Nobuck.relacionamento = { cor_couro_cano: ["Nescau", "Café", ...] }
// getFilteredOptions("cor_couro_cano", { couro_cano: "Nobuck" }) → ["Nescau", "Café", ...]
```

