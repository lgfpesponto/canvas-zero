## Diagnóstico

O pedido **1120** (14/07/2026, Denise) está no banco com `lead_time_snapshot = NULL` e `ficha_versao_id = NULL`.

O cálculo do prazo em `src/lib/orderDeadline.ts` funciona assim:
1. Se o pedido tem `lead_time_snapshot` → usa esse valor (20du atual).
2. Se **não** tem snapshot → cai num **fallback hard-coded** que diz: "bota criada depois de 18/05/2026 = 25du".

Como o 1120 não tem snapshot, ele usa o fallback = **25du** + 1 dia de cutoff (criado 14:24, depois das 06:00) = **26d úteis** exibidos, ignorando o ajuste que você fez na ficha para 20.

Confirmei no banco:
- `ficha_tipos.bota.lead_time_dias = 20` (correto).
- **291 pedidos** criados desde 13/07/2026 estão sem `lead_time_snapshot` — todos vão mostrar o número errado.

### Por que ficaram sem snapshot?

Dois caminhos criam pedidos sem carimbar o snapshot:
- **Edge function `fichas-receber`** (integração site Atacado) — não inclui `lead_time_snapshot` no insert.
- Pedidos criados antes do deploy da migração do snapshot (13/07/2026) — normal, era esperado.

O pedido 1120 (cliente "ml cnpj", provavelmente veio do Atacado) se encaixa no primeiro caso.

## Correções

**1. Backfill (SQL migration)**
Preencher `lead_time_snapshot` de todos pedidos que estão NULL, usando `ficha_tipos.lead_time_dias` para bota/cinto e `extra_produtos.lead_time_dias` para extras. Isso corrige imediatamente os 291 pedidos existentes e faz o 1120 passar a mostrar 20du (21d com cutoff).

**2. `supabase/functions/fichas-receber/index.ts`**
Em `fichaToDbRow`, buscar `ficha_tipos.bota.lead_time_dias` uma vez no handler e incluir `lead_time_snapshot: <valor>` no row inserido. Assim novos pedidos vindos do Atacado já nascem carimbados com o prazo vigente.

**3. `src/lib/orderDeadline.ts` — endurecer o fallback**
Trocar a constante `BOTA_25DU_CUTOFF` (que "chuta" 25du para qualquer bota pós-18/05) por um fallback neutro de 20du. Assim, mesmo que algum pedido futuro escape do snapshot, ele não vai mais fantasmar 25du contra o valor real da ficha. (O caminho correto continua sendo o snapshot; isso é só uma rede de segurança.)

## Escopo

- 1 migration SQL (backfill).
- 1 edit em `supabase/functions/fichas-receber/index.ts`.
- 1 edit em `src/lib/orderDeadline.ts`.

Não altero regras de negócio nem valores de ficha — apenas garanto que o valor atual (20du) seja o que aparece na tela para os pedidos afetados.
