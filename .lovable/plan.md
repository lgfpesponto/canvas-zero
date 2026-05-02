## Renomear status "Bordado 7Estrivos" e adicionar "Baixa Bordado 7Estrivos"

### Mudanças funcionais
1. **Renomear** o status de produção `Bordado 7Estrivos` → `Entrada Bordado 7Estrivos`.
2. **Adicionar** um novo status de produção `Baixa Bordado 7Estrivos`, posicionado **logo após** `Entrada Bordado 7Estrivos` (mantendo a sequência natural: entrada antes da baixa, antes de seguir para Pesponto).

Sequência final do fluxo de bordado:
```
... → Sem bordado → Bordado Dinei → Bordado Sandro → Entrada Bordado 7Estrivos → Baixa Bordado 7Estrivos → Pesponto 01 → ...
```

Ambos novos status entram nas mesmas regras: aparecem nos filtros do dashboard, contam como "em produção", aparecem no relatório de Bordados, podem ser usados no fluxo de avanço/regressão (já coberto pelo guard de regressão existente).

### Arquivos a alterar

**1. `src/lib/order-logic.ts`** — atualizar 3 arrays:
- `PRODUCTION_STATUSES` (linha 39)
- `PRODUCTION_STATUSES_USER` (linha 48)
- `PRODUCTION_STATUSES_IN_PROD` (linha 67)

Em cada um, substituir `"Bordado 7Estrivos"` por `"Entrada Bordado 7Estrivos", "Baixa Bordado 7Estrivos"`.

**2. `src/components/SpecializedReports.tsx`** (linha 63) — atualizar a constante usada no relatório de Bordados:
```ts
const BORDADO_STATUSES = ['Bordado Dinei', 'Bordado Sandro', 'Entrada Bordado 7Estrivos', 'Baixa Bordado 7Estrivos'];
```
Assim o relatório de Bordados continua agrupando pedidos em ambas as etapas do 7Estrivos.

**3. `docs/BUSINESS_RULES.md`** (linha 362) — atualizar a documentação do fluxo para refletir os dois novos nomes na ordem.

### Migração de dados (banco)
Existem **227 pedidos** atualmente com `status = 'Bordado 7Estrivos'` na tabela `orders`. É preciso migrar:
```sql
UPDATE orders SET status = 'Entrada Bordado 7Estrivos' WHERE status = 'Bordado 7Estrivos';
```
Critério: pedidos que estão hoje em "Bordado 7Estrivos" representam peças que **entraram** no bordado, então o destino correto é `Entrada Bordado 7Estrivos`. O novo status `Baixa Bordado 7Estrivos` começa zerado e será atribuído manualmente conforme as peças saírem do bordado.

A migração será feita via arquivo de migração Supabase para ficar versionada.

### O que NÃO muda
- Ordem visual nos selects (mantém ordem dos arrays).
- Lógica de regressão/avanço (`statusRegression.ts`) — funciona com qualquer string nova automaticamente.
- Histórico (`alteracoes`) — entradas antigas continuam apontando para "Bordado 7Estrivos" como referência histórica do que aconteceu naquele momento; isso é correto e não deve ser reescrito.
- Memórias e demais relatórios que não filtram explicitamente por esse status.

### Resumo de impacto
| Local | Ação |
|---|---|
| `order-logic.ts` (3 arrays) | renomear + inserir novo |
| `SpecializedReports.tsx` (BORDADO_STATUSES) | renomear + inserir novo |
| `docs/BUSINESS_RULES.md` | atualizar fluxo |
| Tabela `orders` (227 registros) | UPDATE via migração |
