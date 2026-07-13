## Plano

Estender `src/lib/holidays.ts` para incluir feriados de São Paulo (estado) e Franca (município), além dos nacionais que já existem.

### Adições em `getNationalHolidays` (renomeando lógica sem mudar assinatura pra não quebrar `orderDeadline.ts`, `ReportsPage.tsx`, `HolidayNoticeBanner.tsx`, `AuthContext.tsx`):

**Estado SP (fixos):**
- `07-09` — Revolução Constitucionalista de 1932

**Município de Franca-SP (fixos, Lei Municipal):**
- `05-28` — Aniversário de Franca
- `11-30` — Dia de Santo André (padroeiro)

Corpus Christi já está (nacional facultativo mas tratado como feriado — mantém).

### Sem regressões
- Mesma função/assinatura; consumidores continuam iguais.
- Cache por ano preservado.
- Banner e cálculo de prazo passam a considerar automaticamente os novos.

### Confirmação
Todos consumidores usam `getNationalHolidays`/`isHoliday`/`getHolidaysInMonth` — a expansão do mapa se propaga sem mais mudanças.