

## Corrigir build errors + Refatorar Index.tsx em componentes de dashboard

### Parte 1 — Corrigir build errors (TS1382)

Reescrever as linhas com "Gáspea" nos dois arquivos para garantir encoding UTF-8 limpo e eliminar os erros TS1382.

**Arquivos**: `src/pages/OrderPage.tsx` (linhas 997, 1004), `src/pages/EditOrderPage.tsx` (linhas 585, 590)

---

### Parte 2 — Extrair dashboards para componentes separados

Criar 3 componentes em `src/components/dashboard/`, movendo o JSX de cada `render*Dashboard` para seu arquivo. O `fadeIn` variants do Framer Motion e todos os estilos Tailwind/CSS (`western-shadow`, `bg-card rounded-xl`, `orange-gradient`, etc.) serão copiados exatamente como estão.

**Estrutura:**

```text
src/components/dashboard/
  AdminDashboard.tsx      (~300 linhas)
  FernandaDashboard.tsx   (~25 linhas)
  VendedorDashboard.tsx   (~110 linhas)
```

**`FernandaDashboard.tsx`** — Recebe props: `solaCouroOrders`, `solaRusticaOrders`, `viraColoridaOrders`. Importa `motion`, `fadeIn`, `SpecializedReports`, `SoladoBoard`. JSX idêntico às linhas 261-272.

**`AdminDashboard.tsx`** — Recebe props com todos os estados e handlers necessários (chartPeriod, filters, financialData, chartData, vendedores, alertOrders, deletedOrders, storageInfo, etc.). Importa `motion`, `fadeIn`, recharts, lucide-react, ui components. JSX idêntico às linhas 275-594. Inclui:
- Gráfico de vendas com `LineChart` e `motion.div`
- A receber com `motion.div`
- Produtos na produção com `Popover`, `Checkbox`, `Progress`
- Pedidos de Alerta com `motion.div` e animações
- Pedidos Apagados com Dialog
- SpecializedReports e SoladoBoard
- Storage monitoring com `AlertDialog`

**`VendedorDashboard.tsx`** — Recebe props: user, orders, financialData, chartData, chartPeriod/setChartPeriod, chartProductFilter/set, prodProductFilter/set, PROD_PRODUCT_OPTIONS, produtosProducao, totalProducao, formatCurrency. JSX idêntico às linhas 597-698. Inclui `CommissionPanel`.

**`fadeIn`** — Exportado de cada componente (ou de um arquivo compartilhado). Definição idêntica:
```typescript
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } })
};
```

**`src/pages/Index.tsx` refatorado (~120 linhas)** — Mantém:
- Todos os `useState`, `useMemo`, `useCallback`, `useEffect`
- Funções handler (`handleCleanup`, `handleRestoreOrder`, `handleDismissDeleted`, `handleChecked`)
- Hero section (linhas 701-723)
- Lógica de roteamento: `isFernanda ? <FernandaDashboard /> : isAdmin ? <AdminDashboard /> : <VendedorDashboard />`
- Seção de login (linhas 731-739)

Remove: todo o JSX dos 3 dashboards, imports não mais usados diretamente.

### Garantias visuais

- Todas as classes Tailwind (`bg-card rounded-xl p-6 western-shadow`, `orange-gradient`, `leather-gradient`, etc.) preservadas caractere por caractere
- Todos os `motion.div` com `initial="hidden" animate="visible" variants={fadeIn} custom={N}` preservados
- Inline styles (`style={{ fontFamily: ... }}`) mantidos
- Componentes internos (recharts, Popover, Progress, Dialog, AlertDialog) com mesmas props

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/OrderPage.tsx` | Reescrever linhas 997, 1004 (fix encoding) |
| `src/pages/EditOrderPage.tsx` | Reescrever linhas 585, 590 (fix encoding) |
| `src/components/dashboard/AdminDashboard.tsx` | Novo — extraído de renderAdminDashboard |
| `src/components/dashboard/FernandaDashboard.tsx` | Novo — extraído de renderFernandaDashboard |
| `src/components/dashboard/VendedorDashboard.tsx` | Novo — extraído de renderVendedorDashboard |
| `src/pages/Index.tsx` | Refatorado — importa e renderiza componentes |

