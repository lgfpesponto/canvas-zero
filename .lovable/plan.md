

## Ajustar navegação e persistência de filtros

### Parte 1 — `{ replace: true }` na edição

**`src/pages/EditOrderPage.tsx` (linha 504)**
```typescript
navigate(`/pedido/${id}`, { replace: true });
```

**`src/pages/EditExtrasPage.tsx` (linha 187)**
```typescript
navigate(`/pedido/${order.id}`, { replace: true });
```

Isso remove a página de edição do histórico. O botão "Voltar" na OrderDetailPage (que usa `navigate(-1)`) levará direto para `/relatorios`.

### Parte 2 — Persistência de filtros via URL (ReportsPage)

**Sincronização com `useSearchParams`:**

Substituir os `useState` dos filtros por valores derivados de `useSearchParams`:
- `status` → `?status=corte,bordado` (Set serializado como CSV)
- `vendedor` → `?vendedor=nome1,nome2`
- `q` → `?q=busca`
- `de` / `ate` → `?de=2026-01-01&ate=2026-04-09`
- `produto` → não precisa persistir (já tem default com todos selecionados)

Ao alterar qualquer filtro, atualizar `searchParams` com `setSearchParams`. Ao carregar a página, inicializar os estados a partir dos params da URL.

**Implementação:**
- Adicionar `useSearchParams` no início do componente
- Criar um `useEffect` de inicialização que lê os params e seta os estados
- Em cada handler de filtro (`setFilterStatus`, `setFilterDate`, etc.), chamar também `setSearchParams` para manter a URL sincronizada
- Usar `useMemo` para a filtragem de pedidos (já existe parcialmente)

### Parte 3 — Botão Voltar na OrderDetailPage

O botão "Voltar" na OrderDetailPage já usa `navigate(-1)` (linha 222). Com o `{ replace: true }` da Parte 1, o `-1` levará corretamente para `/relatorios?...` com os filtros preservados na URL. Nenhuma alteração necessária aqui.

### Resumo de arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/EditOrderPage.tsx` | Adicionar `{ replace: true }` ao navigate |
| `src/pages/EditExtrasPage.tsx` | Adicionar `{ replace: true }` ao navigate |
| `src/pages/ReportsPage.tsx` | Sincronizar filtros com `useSearchParams` |

