## Objetivo

1. Descontar **feriados nacionais brasileiros** do cálculo de dias úteis (prazo de produção e atraso).
2. Adicionar um filtro **"Apenas atrasados"** na página Meus Pedidos.
3. Exibir um **aviso fixo acima de Meus Pedidos** listando os feriados nacionais do mês atual que serão descontados do prazo.

---

## 1. Feriados nacionais (cálculo automático)

Feriados nacionais brasileiros são determinísticos — dá pra calcular **localmente, sem API externa**, cobrindo qualquer ano automaticamente. (Feriados estaduais/municipais não entram porque não são padronizados.)

### Novo arquivo `src/lib/holidays.ts`
- `easterSunday(year)` — algoritmo de Meeus/Jones/Butcher.
- `getNationalHolidays(year)` retorna `Map<YYYY-MM-DD, nome>`:
  - **Fixos**: 01/01 Confraternização, 21/04 Tiradentes, 01/05 Trabalho, 07/09 Independência, 12/10 N. Sra. Aparecida, 02/11 Finados, 15/11 Proclamação, 20/11 Consciência Negra (nacional desde 2024), 25/12 Natal.
  - **Móveis (em relação à Páscoa)**: Carnaval segunda (−48) e terça (−47), Sexta‑Feira Santa (−2), Corpus Christi (+60).
- `isHoliday(date)`, `isBusinessDay(date)` (fim de semana **ou** feriado → não é útil).
- `getHolidaysInMonth(year, month)` para o aviso visual.
- Cache em memória por ano.

### Atualização `src/contexts/AuthContext.tsx`
- `addBusinessDays`, `businessDaysRemaining`, `businessDaysOverdue` passam a usar `isBusinessDay()` em vez de checar só `getDay()`.
- Toda a UI que já usa esses helpers (OrderCard, SoladoBoard, AdminDashboard alertas, OrderDetailPage, etc.) herda o comportamento sem mudanças adicionais.

---

## 2. Aviso de feriados acima de Meus Pedidos

### Onde
`src/pages/ReportsPage.tsx`, no topo do conteúdo principal (antes da barra de filtros).

### Comportamento
- Componente novo `HolidayNoticeBanner` (em `src/components/HolidayNoticeBanner.tsx`).
- Mostra os feriados nacionais que caem em **dia útil** (seg–sex) do **mês corrente** — feriado em sábado/domingo não afeta o prazo, então é omitido para não poluir.
- Texto: *"Feriados deste mês descontados do prazo: 12/10 (N. Sra. Aparecida), 15/11 (Proclamação)."*
- Se não houver feriado útil no mês: banner não aparece.
- Visual: `Alert` discreto (variant default, ícone calendário), dispensável (botão `X` que esconde até o próximo carregamento — sem persistência, para não esconder permanentemente).

---

## 3. Filtro "Apenas atrasados" em Meus Pedidos

### Onde
`src/pages/ReportsPage.tsx` — junto aos filtros existentes (Status, Vendedor, Produto).

### Mudanças
- Novo estado `onlyOverdue: boolean`, sincronizado com URL via param `atrasados=1` (segue padrão de `mem://features/reports/filter-url-persistence`).
- Toggle: `Switch` com label **"Apenas atrasados"**, destacado em vermelho quando ativo.
- Lógica: depois dos demais filtros (busca, datas, status, vendedor, produto, mudou‑para‑status), filtra por `getOrderDeadlineInfo(order).isOverdue === true`. Como `isOverdue` já exclui os status finais (Expedição/Entregue/Cobrado/Pago/Cancelado), só sobram os realmente atrasados em produção.
- Incluído no botão "Limpar filtros".
- Totais do rodapé (pedidos/produtos/valor) refletem automaticamente — usam o array já filtrado.
- Cálculo client‑side; não exige mudar a RPC `get_orders_totals`.

---

## Arquivos afetados
- **Novos**: `src/lib/holidays.ts`, `src/components/HolidayNoticeBanner.tsx`
- **Editados**: `src/contexts/AuthContext.tsx`, `src/pages/ReportsPage.tsx`
- **Memória**: atualizar `mem://features/production/lead-times` (feriados nacionais excluídos automaticamente)

Sem migrações de banco, sem edge functions, sem dependências externas.
