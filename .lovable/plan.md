## Ajustes solicitados

### 1. "Trocar para Bota" deve abrir direto a ficha de Bota

Hoje, no `BeltOrderPage`, o botão "Trocar para Bota" faz `navigate('/pedido')`. Como `OrderPage` sempre mostra a tela "Faça seu Pedido" (escolha entre Bota/Cinto) quando `productChoice` está `null`, o usuário cai de novo na seleção.

**Mudança:**
- `src/pages/BeltOrderPage.tsx`: alterar o botão para `navigate('/pedido?tipo=bota')`.
- `src/pages/OrderPage.tsx`: ao montar, se `searchParams.get('tipo') === 'bota'`, chamar `setProductChoice('bota')` (via `useEffect`) — assim a tela de escolha é pulada. Nada muda no fluxo normal (`/pedido` sem query continua mostrando a escolha).
- Simetria opcional: aplicar a mesma lógica em `OrderPage` "Trocar para Cinto" → `navigate('/pedido-cinto?tipo=cinto')` e ler no `BeltOrderPage` (apenas se quiser consistência; posso incluir).

### 2. Modelos (rascunhos com foto) — melhorar mobile

Página `src/pages/ModelosPage.tsx`, componente `TemplateCard`.

**Mudanças (puramente visuais, mantendo 2 colunas no mobile):**
- Card: altura da foto reduz no mobile para caber na tela. `h-56` → `h-40 sm:h-48 lg:h-56`.
- Padding interno menor no mobile: `p-3` → `p-2 sm:p-3`.
- Nome com fonte adaptativa: `text-sm` → `text-xs sm:text-sm`.
- Badge do tipo levemente menor no mobile.
- Botão "Comprar": mantém `size="sm"` mas com `text-xs sm:text-sm` para não estourar em telas estreitas.
- Grid: mantém `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`, apenas reduz gap no mobile (`gap-2 sm:gap-3`).

### 3. Paginação em `/modelos` — 20 por página

Ainda em `src/pages/ModelosPage.tsx`:

- Adicionar `const [page, setPage] = useState(1)` e `const PAGE_SIZE = 20`.
- Resetar `page` para 1 sempre que `search` ou `tiposAtivos` mudarem (via `useEffect`).
- Derivar `paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)` e renderizar `paginated` no grid.
- Controle de paginação abaixo do grid: usar o componente `Pagination` já existente em `src/components/ui/pagination.tsx` (Anterior / números / Próxima), só aparece se `filtered.length > PAGE_SIZE`.
- Contador do topo continua mostrando o total (`filtered.length`), mas com sufixo `— página X de Y` quando houver mais de uma.

## Detalhes técnicos

- Nenhuma mudança de regra de negócio, banco ou permissões.
- `OrderPage` já usa `useSearchParams` (ou pode importar de `react-router-dom`), sem impacto em `comprarModeloOverride` (fluxo embarcado do espelho não passa por query string).
- Todos os textos/badges permanecem em UTF-8 literal.
