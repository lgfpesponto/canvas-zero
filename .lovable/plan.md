## Objetivo
Fazer a página `Estoque` usar exatamente o mesmo modal e chaves dinâmicas de "Filtros da ficha" que a página `Modelos`, para pegar todas as categorias (Couros, Solados, Bordados, Extras, Metais, Fivelas, etc.) da versão atual da ficha.

## Arquivo: `src/pages/EstoquePage.tsx`

1. **Imports** — adicionar:
   ```ts
   import FichaFiltersDialog from '@/components/common/FichaFiltersDialog';
   import { buildFichaOptions, matchesFichaFilters, countActiveFicha, useFichaFilterKeys } from '@/lib/fichaFilterKeys';
   ```

2. **Remover** o `FICHA_FILTER_KEYS` local hardcoded (linhas 40-46).

3. **Buscar chaves dinâmicas** dentro do componente:
   ```ts
   const fichaKeys = useFichaFilterKeys(['bota', 'cinto']);
   ```

4. **Trocar `fichaOptions`** por `buildFichaOptions(rows, r => r.ficha_snapshot, fichaKeys)`.

5. **Trocar o loop manual de filtro** (linhas 196-201) por `matchesFichaFilters(g.ficha_snapshot, selFicha, fichaKeys)`.

6. **Substituir o Dialog inline** (linhas 540-598) por:
   ```tsx
   <FichaFiltersDialog
     open={fichaFilterOpen}
     onOpenChange={setFichaFilterOpen}
     fichaOptions={fichaOptions}
     selFicha={selFicha}
     onToggle={toggleFicha}
     onClear={() => setSelFicha({})}
     keys={fichaKeys}
   />
   ```
   Remover state `fichaFilterSearch` (agora interno ao dialog) e imports não mais usados (`Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` se não usados em outro lugar da página).

7. **Badge de contagem** do botão de filtros — se ainda estiver com contador manual, trocar por `countActiveFicha(selFicha)` para pegar as novas categorias.

## Fora de escopo
- Comportamento do modal já foi tratado (categorias fechadas, ordem, busca flat, "Sugerido").
- Não altera schema, snapshots ou ordenação dos produtos.
