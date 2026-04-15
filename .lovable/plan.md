

## Plano: Corrigir lookup de variações para usar campo_id

### Problema
O hook `useFichaVariacoesLookup` busca variações fazendo join com `ficha_categorias` via `categoria_id`. Porém, novas variações adicionadas pelo admin recebem um `categoria_id` de categoria visual (ex: `bordados-visual`), enquanto o `CATEGORY_MAP` espera slugs de categoria de dados (ex: `bordados-gaspea`). Resultado: variações novas não aparecem.

### Solução
Alterar **apenas** o hook `useFichaVariacoesLookup.ts` para fazer join com `ficha_campos` (via `campo_id`) em vez de `ficha_categorias` (via `categoria_id`). O `CATEGORY_MAP` passa a mapear para slugs de **campos** em vez de slugs de categorias.

### Alterações

#### Arquivo: `src/hooks/useFichaVariacoesLookup.ts`

1. Mudar `CATEGORY_MAP` para usar slugs de campo:
   - `bordado_cano` → `bordado_cano`
   - `bordado_gaspea` → `bordado_gaspea`
   - `bordado_taloneira` → `bordado_taloneira`
   - `laser_cano` → `laser_cano`
   - `laser_gaspea` → `laser_gaspea`
   - `laser_taloneira` → `laser_taloneira`

2. Mudar a query de:
   ```
   .select('nome, preco_adicional, categoria_id, relacionamento, ficha_categorias!inner(slug)')
   ```
   Para:
   ```
   .select('nome, preco_adicional, campo_id, relacionamento, ficha_campos!inner(slug)')
   ```

3. Mudar o mapeamento de `categoria_slug` para `campo_slug` internamente (renomear o campo na interface para `campo_slug` ou manter o nome `categoria_slug` para compatibilidade -- vou manter o mesmo nome de propriedade para não quebrar nada externo)

4. Ajustar o `.map()` para usar `d.ficha_campos?.slug` em vez de `d.ficha_categorias?.slug`

### O que NÃO muda
- `OrderPage.tsx` -- zero alterações
- `EditOrderPage.tsx` -- zero alterações
- `OrderDetailPage.tsx` -- zero alterações
- A interface pública (`getByCustomCategory`, `findFichaPrice`) permanece idêntica
- Os retornos (`{ label, preco }[]` e `number | undefined`) não mudam

### Risco
Nenhum. A mudança é interna ao hook. Os consumidores chamam `getByCustomCategory('bordado_gaspea')` e recebem o mesmo formato de volta. A única diferença é que agora a filtragem usa `campo_id` → `ficha_campos.slug`, que é sempre correto tanto para variações antigas quanto novas.

