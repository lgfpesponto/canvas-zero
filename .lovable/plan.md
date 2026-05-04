## Comissão Bordado em Relatórios + Indicador Global de "Carregando"

### Parte 1 — Novo relatório "Comissão Bordado" no admin_master

**Arquivo:** `src/components/SpecializedReports.tsx`

- Adicionar tipo `'comissao_bordado'` em `ReportType` e `REPORT_LABELS['comissao_bordado'] = 'Comissão Bordado'`.
- Adicionar import: `generateBordadoBaixaResumoPDF` de `@/lib/pdfGenerators`, `supabase` de `@/integrations/supabase/client`, `dbRowToOrder, PRODUCTION_STATUSES` de `@/lib/order-logic`.
- Criar estado de período (já existe `filterDataDe/filterDataAte` — reutilizar) e função `generateComissaoBordadoPDF` que replica a lógica do `BordadoPortalPage.gerarPDF`:
  1. Validar `pdfDe ≤ pdfAte`.
  2. RPC `find_orders_by_status_change` com `_status: ['Baixa Bordado 7Estrivos']`.
  3. Buscar `orders` por `id` IN (lista), mapear via `dbRowToOrder`.
  4. Filtrar status ≥ índice de "Baixa Bordado 7Estrivos" e `!== 'Cancelado'`.
  5. Chamar `generateBordadoBaixaResumoPDF(valid, de, ate, userName)`.
- No bloco de filtros, mostrar 2 inputs de data (De/Até) quando `activeReport === 'comissao_bordado'` (similar ao bloco do `corte`, mas obrigatório).
- Atualizar `progressoFileLabel`/flags para o novo report não exigir filtro de progresso/vendedor.
- No `switch` do `generateReport`, adicionar `case 'comissao_bordado': await generateComissaoBordadoPDF(); break;`.

**Arquivo:** `src/components/dashboard/AdminDashboard.tsx`
- Adicionar `'comissao_bordado'` no array de `reports` passado para `<SpecializedReports>`.

> Importante: o relatório aparece apenas no AdminDashboard (admin_master/admin_producao). FernandaDashboard e portal Bordado seguem inalterados.

### Parte 2 — Indicador global "Carregando" em todas as ações

**Estratégia:** intercepta `window.fetch` para contar requisições em voo. Funciona para Supabase (REST/Auth/Functions) sem precisar refatorar cada chamada — incluindo o login.

**Arquivos novos:**

1. `src/lib/globalLoading.ts`
   - Exporta `subscribeLoading(listener)`, `startLoading()`, `endLoading()`.
   - No carregamento do módulo, faz `window.fetch = wrappedFetch` que incrementa/decrementa um contador (try/finally garante decremento).
   - Ignora chamadas realtime/WebSocket (fetch não é usado para WS, ok).

2. `src/components/GlobalLoadingIndicator.tsx`
   - Fixed bottom-right, z alto, fundo `bg-card/95` com borda + sombra.
   - Mostra `<Loader2 className="animate-spin" />` + texto "Carregando".
   - Usa `useSyncExternalStore` (ou `useState + useEffect`) com `subscribeLoading`. Aparece quando `count > 0` (com pequeno delay de ~150 ms para não piscar em requests rápidos).

**Arquivo:** `src/main.tsx` (ou `src/App.tsx`)
- Importar `'@/lib/globalLoading'` no topo (efeito colateral: instala o wrap).

**Arquivo:** `src/App.tsx`
- Montar `<GlobalLoadingIndicator />` dentro do `<TooltipProvider>` (fora do `<ChromeWrapper>` para aparecer também na tela de login).

**Arquivo:** `src/pages/LoginPage.tsx`
- Atualizar o botão "ENTRAR" para incluir `<Loader2 className="w-4 h-4 animate-spin" />` + "CARREGANDO..." quando `loading` (em vez de só "ENTRANDO..."). Mantém o overlay global também aparecendo.

### Resultado

- admin_master gera "Comissão Bordado" pelo painel admin sem precisar acessar o portal Bordado.
- Qualquer ação que dispare requisição HTTP (login, salvar, gerar PDF, mover etapa, etc.) automaticamente mostra o chip "Carregando" no canto da tela.
