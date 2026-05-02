## Problema
A célula "Cliente" mostrada no card "Detalhes da Bota" (imagem) não vem do array `detailsGrouped` da `OrderDetailPage` — ela é renderizada via `buildBootFichaCategories` em `src/lib/orderFichaCategories.ts` (linha 25), que sempre adiciona Cliente quando preenchido. Por isso a alteração anterior não surtiu efeito nessa visualização.

## Ajuste
1. `src/lib/orderFichaCategories.ts`: aceitar parâmetro opcional `{ showCliente }` e só incluir Cliente quando `showCliente !== false`.
2. `src/pages/OrderDetailPage.tsx` (linha 1093): passar `{ showCliente }` usando a mesma regra já existente (`order.vendedor === 'Juliana Cristina Ribeiro' || order.vendedor === 'Rancho Chique'`).

```ts
// orderFichaCategories.ts
export function buildBootFichaCategories(order, opts?: { showCliente?: boolean }) {
  const showCliente = opts?.showCliente ?? true;
  ...
  if (showCliente && order.cliente) identFields.push({ label: 'Cliente:', value: lower(order.cliente) });
}
```

```tsx
// OrderDetailPage.tsx ~1093
const fichaCats = buildBootFichaCategories(order, { showCliente });
```

Default `true` mantém compatibilidade com PDF e qualquer outro consumidor.

## Arquivos afetados
- `src/lib/orderFichaCategories.ts`
- `src/pages/OrderDetailPage.tsx`
