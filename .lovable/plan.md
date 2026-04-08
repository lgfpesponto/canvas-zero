

## Refatoração de Performance no Index.tsx + Centralização de Status

### Parte 1 — Criar `src/lib/order-logic.ts`

Novo arquivo centralizando:
- `PRODUCTION_STATUSES`, `PRODUCTION_STATUSES_USER`, `EXTRAS_STATUSES`, `BELT_STATUSES` (movidos de `AuthContext.tsx`)
- `PRODUCTION_STATUSES_IN_PROD` (movido de `Index.tsx` e `ProfilePage.tsx`)
- `EXCLUDED_PREFIXES` e `isExcludedOrder()`
- `PROD_PRODUCT_OPTIONS` (construído a partir de `EXTRA_PRODUCTS`)
- Helpers: `getProductType()`, `matchVendedorFilter()`, `matchVendedorFilterSet()`, `formatCurrency()`
- Constante `ADMIN_STATUS_ROLES` = `['admin_master', 'admin_producao']` para controlar quem pode alterar status

O `AuthContext.tsx` passa a re-exportar os status de `order-logic.ts` para não quebrar imports existentes.

### Parte 2 — Mover lógica de dados para os dashboards

**AdminDashboard.tsx** — recebe apenas `{ role }` do Index e internamente:
- Importa `allOrders`, `user`, `allProfiles` do `useAuth()`
- Calcula `vendedores`, `financialData`, `chartData`, `produtosProducao`, `totalProducao` via `useMemo`
- Gerencia estados locais: `chartPeriod`, filtros, `deletedOrders`, `storageInfo`, `checkedAlertIds`
- Substitui `user?.nomeUsuario?.toLowerCase() === '7estrivos'` por `role === 'admin_master'`
- Remove prop `isJuliana` (usa `role === 'admin_master'` diretamente)

**VendedorDashboard.tsx** — recebe apenas `{ role }` e internamente:
- Importa `orders`, `user` do `useAuth()`
- Calcula `financialData`, `chartData`, `produtosProducao`, `totalProducao` localmente
- Mantém `CommissionPanel` condicionado a `role === 'vendedor_comissao'`

**FernandaDashboard.tsx** — sem props, internamente:
- Importa `allOrders` do `useAuth()` e calcula `solaCouroOrders`, `solaRusticaOrders`, `viraColoridaOrders`

### Parte 3 — Index.tsx vira roteador puro

```tsx
const Index = () => {
  const { isLoggedIn, role } = useAuth();
  return (
    <div className="min-h-screen">
      <HeroSection />
      {isLoggedIn ? (
        role === 'admin_producao' ? <FernandaDashboard /> :
        role === 'admin_master' ? <AdminDashboard /> :
        <VendedorDashboard />
      ) : (
        <LoginPrompt />
      )}
    </div>
  );
};
```

- Remove referência ao role `'admin'` legado (já migrado)
- Hero e LoginPrompt extraídos como componentes inline ou no mesmo arquivo

### Parte 4 — Atualizar imports nos consumidores

| Arquivo | Alteração |
|---------|-----------|
| `AuthContext.tsx` | Re-exporta status de `order-logic.ts`, remove definições locais |
| `SpecializedReports.tsx` | Import de `order-logic.ts` |
| `SoladoBoard.tsx` | Import de `order-logic.ts` |
| `ReportsPage.tsx` | Import de `order-logic.ts` |
| `OrderDetailPage.tsx` | Import de `order-logic.ts` |
| `ProfilePage.tsx` | Import `PRODUCTION_STATUSES_IN_PROD` de `order-logic.ts` |
| `AdminDashboard.tsx` | Usa `role === 'admin_master'` em vez de `nomeUsuario` checks |

### O que NÃO muda

- Layout de impressão (fichas de produção, canhoto, meia folha)
- Lógica de vínculos de campos em `orderFieldsConfig.ts` (tamanhos/modelos/solados/bicos)
- Privacidade do campo Cliente (visível para ADMs apenas se `vendedor_comissao`)
- Visual, animações Framer Motion e estilos Tailwind (apenas movidos para dentro dos componentes)

### Resumo de arquivos

| Arquivo | Ação |
|---------|------|
| `src/lib/order-logic.ts` | Novo |
| `src/pages/Index.tsx` | Simplificado (~40 linhas) |
| `src/components/dashboard/AdminDashboard.tsx` | Autossuficiente com dados |
| `src/components/dashboard/VendedorDashboard.tsx` | Autossuficiente com dados |
| `src/components/dashboard/FernandaDashboard.tsx` | Autossuficiente com dados |
| `src/contexts/AuthContext.tsx` | Re-exports, remove definições |
| 5 consumidores de status | Atualizar imports |

