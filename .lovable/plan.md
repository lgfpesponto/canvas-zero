

## Correcao da busca por codigo de barras

### Problema
O `fetchOrderByScan` so busca por `numero` e por `id` (UUID completo). O codigo de barras gera um hex de 12 caracteres (ultimos 12 chars do UUID sem tracos), que nao bate com nenhuma das duas buscas.

Exemplo:
- UUID do pedido: `8917766d-3de3-4dd2-b107-d9169f23eaf1`
- Barcode gerado: `D9169F23EAF1` (ultimos 12 hex, uppercase)
- `fetchOrderByScan('D9169F23EAF1')` tenta `eq('numero', 'D9169F23EAF1')` → nao encontra, depois `eq('id', 'D9169F23EAF1')` → nao e UUID valido → falha

### Solucao

Atualizar `fetchOrderByScan` em `src/hooks/useOrders.ts` para tambem tentar:

1. **Busca por hex do barcode**: se o codigo tem 12 chars hex, converter para o sufixo do UUID e buscar com `id.ilike.%{hex_lower}` (Supabase text filter nos ultimos 12 chars do id)
2. **Busca por legacy barcode (digits padded)**: se o codigo e numerico com 10 digitos, extrair os digitos significativos e buscar por `numero`

```typescript
export async function fetchOrderByScan(code: string): Promise<Order | null> {
  const trimmed = code.trim();
  
  // Try by numero first
  const { data: byNumero } = await supabase.from('orders').select('*')
    .eq('numero', trimmed).maybeSingle();
  if (byNumero) return dbRowToOrder(byNumero);

  // Try by full UUID id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(trimmed)) {
    const { data: byId } = await supabase.from('orders').select('*')
      .eq('id', trimmed).maybeSingle();
    if (byId) return dbRowToOrder(byId);
  }

  // Try by barcode hex (last 12 hex chars of UUID)
  const hexRegex = /^[0-9A-Fa-f]{12}$/;
  if (hexRegex.test(trimmed)) {
    const suffix = trimmed.toLowerCase();
    // UUID format: xxxxxxxx-xxxx-xxxx-XXXX-XXXXXXXXXXXX
    // Last 12 hex = last 4 of block4 + all 12 of block5
    // Search with ilike on the id column
    const { data: byHex } = await supabase.from('orders').select('*')
      .ilike('id', `%${suffix.slice(0,4)}-${suffix.slice(4)}`)
      .maybeSingle();
    if (byHex) return dbRowToOrder(byHex);
  }

  // Try legacy barcode (10 digits padded from numero)
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    const realNumero = digits.replace(/^0+/, '');
    if (realNumero) {
      const { data: byLegacy } = await supabase.from('orders').select('*')
        .eq('numero', realNumero).maybeSingle();
      if (byLegacy) return dbRowToOrder(byLegacy);
    }
  }

  return null;
}
```

### Arquivo alterado

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useOrders.ts` | Atualizar `fetchOrderByScan` com busca por hex barcode e legacy barcode |

Nenhuma outra alteracao necessaria — os chamadores em `ReportsPage.tsx` e `OrderDetailPage.tsx` ja usam essa funcao.

