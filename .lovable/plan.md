

## Ajustes de navegação e persistência de filtros

### Parte 1 — Histórico do botão Voltar

**Problema**: Ao editar a partir da OrderDetailPage, o histórico fica: `/relatorios` → `/pedido/X` → `/pedido/X/editar` → (replace) `/pedido/X`. O navigate(-1) leva para a entrada anterior `/pedido/X` (duplicata), exigindo dois cliques para chegar em `/relatorios`.

**Correção**: Na OrderDetailPage (linha 310), ao navegar para a página de edição, usar `{ replace: true }`:

```typescript
navigate(`/pedido/${order.id}/editar`, { replace: true });
```

Isso substitui `/pedido/X` por `/pedido/X/editar` no histórico. Após o save (que já usa replace), o stack fica: `/relatorios` → `/pedido/X`. Um clique em Voltar retorna a `/relatorios`.

O mesmo ajuste para o botão de editar no OrderCard (linha 52) — este já funciona pois não tem entrada intermediária, mas manter consistência não causa problema.

### Parte 2 — Limpar filtros também limpa a URL

**Problema**: O botão "Limpar Filtros" (linha 556-568) reseta os estados mas não chama `syncSearchParams`, então a URL mantém os params antigos. Ao navegar e voltar, os filtros velhos reaparecem.

**Correção**: Após o reset dos estados, chamar `setSearchParams({}, { replace: true })` para limpar a URL.

### Parte 3 — Confirmar persistência de múltiplos valores CSV

A lógica de serialização (`join(',')`) e parsing (`split(',')`) está correta. O `URLSearchParams.set()` preserva vírgulas literais no valor (não as codifica como separadores). A inicialização de `appliedFilters` (linhas 93-100) usa diretamente o `filterStatus` derivado da URL, o que é correto.

Se houver alguma inconsistência residual, pode ser porque o `appliedFilters.filterStatus` na inicialização (linha 97) captura a referência do Set no momento da criação do estado. Vou garantir que isso use uma cópia fresh: `filterStatus: new Set(filterStatus)`.

### Resumo de alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/OrderDetailPage.tsx` | `{ replace: true }` no navigate para edição (linha 310) |
| `src/pages/ReportsPage.tsx` | Limpar URL no handler de "Limpar Filtros" + `new Set(filterStatus)` na init de appliedFilters |

