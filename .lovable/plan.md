

## Trocar "Carregar mais" por paginação real (50 pedidos por página)

### Arquivo: `src/pages/ReportsPage.tsx`

#### 1. Alterar lógica de `paginatedOrders`
Substituir acumulação por fatia fixa:
```ts
const paginatedOrders = useMemo(() => {
  const start = (page - 1) * PAGE_SIZE;
  return visibleOrders.slice(start, start + PAGE_SIZE);
}, [visibleOrders, page]);

const totalPages = Math.ceil(visibleOrders.length / PAGE_SIZE);
```

#### 2. Substituir botão "Carregar mais" por controles de paginação
- Botões "Anterior" e "Próxima"
- Indicador "Página X de Y"
- Usar componentes `Pagination` já existentes no projeto (`src/components/ui/pagination.tsx`)

#### 3. Scroll to top ao mudar de página
```ts
window.scrollTo({ top: 0, behavior: 'smooth' });
```

#### 4. Reset de página ao filtrar
Já existe — `setPage(1)` ao aplicar filtros (manter).

### Resultado
DOM sempre com no máximo 50 cards → peso constante, sem risco de tela branca.

