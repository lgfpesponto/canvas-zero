## Objetivo

Replicar na **EditOrderPage** os campos selecionáveis presentes na **OrderPage** (ficha de produção) que estão atualmente ausentes — em especial os **Recortes** (Cano / Gáspea / Taloneira) e suas cores. Hoje, quando o admin edita o pedido, esses campos somem da tela mesmo quando preenchidos, e não há como alterar/persistir alterações.

## Diagnóstico

Comparando `src/pages/OrderPage.tsx` × `src/pages/EditOrderPage.tsx`:

Faltam em EditOrderPage (existem em OrderPage e são persistidos no DB via `order-logic.ts`):

- `recorteCano` + `corRecorteCano`
- `recorteGaspea` + `corRecorteGaspea`
- `recorteTaloneira` + `corRecorteTaloneira`

Esses campos:
- Já existem no tipo `Order` (`src/contexts/AuthContext.tsx`).
- Já são lidos/escritos por `dbRowToOrder` / `orderToDbRow` em `src/lib/order-logic.ts`.
- São renderizados no `OrderPage` dentro da seção **"Laser e Recortes"** usando `getDbItems('recorte_cano' | 'recorte_gaspea' | 'recorte_taloneira', [])` — exatamente o mesmo padrão dos bordados.

Resultado: ao abrir um pedido para editar, o admin não vê os recortes selecionados nem consegue mudá-los.

## Mudança técnica em `src/pages/EditOrderPage.tsx`

1. **Estado**: adicionar 6 novos `useState`:
   ```
   recorteCano, corRecorteCano,
   recorteGaspea, corRecorteGaspea,
   recorteTaloneira, corRecorteTaloneira
   ```

2. **Hidratação** (no `useEffect` que faz `setX(order.X)`): popular os 6 estados a partir do `order`.

3. **UI**: dentro da seção `<Section title="Laser">` (renomear para **"Laser e Recortes"** para casar com OrderPage), adicionar, logo após cada bloco de Laser por região, o respectivo `SelectField` de Recorte + input condicional de Cor do Recorte — espelhando OrderPage linhas 1351-1376:
   ```
   <SelectField label="Recortes do Cano"
     value={recorteCano}
     onChange={v => { setRecorteCano(v); if (!v) setCorRecorteCano(''); }}
     options={getDbItems('recorte_cano', [])} />
   {recorteCano && <input ... cor do recorte ... />}
   ```
   (idem para Gáspea e Taloneira)

4. **Persistência**: incluir os 6 campos no objeto passado para `updateOrder(order.id, { ... })`.

Nada muda em backend, RLS, tipos ou outras telas.

## Fora do escopo

- Não migrar `corBordadoLaser*` da OrderPage — esse trio só existe como rascunho em OrderPage (não está no tipo `Order` nem no DB), portanto não é editável pós-criação por design.
- Não mexer em EditExtrasPage / EditBeltPage.
- Não alterar a lógica de preços (recorte já entra via `getByCategoria` quando configurado em `custom_options` / `ficha_variacoes`).

## Resultado esperado

Ao editar um pedido com recortes, o admin vê os campos preenchidos (com as opções vindas do banco — mesmo merge `ficha_variacoes` → `custom_options` → fallback usado na ficha de produção) e pode alterá-los; as mudanças são salvas no DB.
