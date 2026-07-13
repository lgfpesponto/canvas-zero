
## Objetivo

Permitir ao admin editar o prazo de produção (em dias úteis) diretamente:
- no modo edição da ficha da **bota** e do **cinto** (Faça seu Pedido);
- no popover de edição de cada **extra** (card em Extras).

Regras:
- O valor exibido no pedido (contagem regressiva em dias úteis, sem sábado/domingo/feriados) passa a vir desse prazo configurado.
- Pedidos **novos** (criados a partir da mudança) usam o prazo vigente no momento da criação — congelado no pedido.
- Pedidos **antigos** não mudam: continuam com o prazo que já estava valendo quando foram criados.
- Cálculo de dias úteis e feriados (nacionais + SP + Franca) permanece igual.

## Plano

### 1. Banco (uma migration)

- `ALTER TABLE public.ficha_tipos ADD COLUMN lead_time_dias integer NOT NULL DEFAULT 20;`
  - Seed: `bota=25`, `cinto=20` (mantém regra atual).
- `ALTER TABLE public.extra_produtos ADD COLUMN lead_time_dias integer NOT NULL DEFAULT 1;`
  - Seed dos tipos existentes usando os valores atuais de `EXTRA_LEAD_TIMES` em `src/lib/orderDeadline.ts` (tiras_laterais=2, desmanchar=7, gravata_country=7, kit_canivete=4, kit_faca=4, carimbo_fogo=5, revitalizador=1, kit_revitalizador=1, adicionar_metais=7, chaveiro_carimbo=5, bainha_cartao=7, bainha_celular=7, regata=20, regata_pronta_entrega=1, bota_pronta_entrega=1, gravata_pronta_entrega=1, palmilha=1).
- `ALTER TABLE public.orders ADD COLUMN lead_time_snapshot integer;`
  - Nullable — pedidos antigos ficam `NULL` e caem no fallback antigo (regra por data de criação para bota + tabela hardcoded).

### 2. Snapshot na criação do pedido

- Em `OrderPage.tsx` (bota), `BeltOrderPage.tsx` (cinto) e `ExtrasPage.tsx` (extras): ao salvar o pedido, buscar o `lead_time_dias` correspondente (do `ficha_tipos` do slug, ou do `extra_produtos` do tipo) e gravar em `orders.lead_time_snapshot`.
- Para `bota_pronta_entrega`: snapshot = `1 + max(lead_time_dias dos extras embutidos)` no momento da criação (mesma fórmula atual, mas congelada).

### 3. Cálculo do prazo (`src/lib/orderDeadline.ts`)

- `getTotalBizDays(order)` passa a priorizar `order.lead_time_snapshot` quando presente e > 0.
- Fallback (pedidos antigos, sem snapshot): mantém a lógica atual — regra 20/25du por data para bota, tabela `EXTRA_LEAD_TIMES` para extras.
- Nenhuma outra função muda; feriados e dias úteis já estão certos.

### 4. UI de edição

**Ficha da Bota / Cinto (modo edição)**
- No `FichaBuilder.tsx` (usado por `AdminConfigFichaPage`), adicionar um campo compacto no topo: “Prazo de produção (dias úteis)” com input numérico ligado a `ficha_tipos.lead_time_dias`. Botão "salvar" reaproveita o fluxo existente (ou um mini-save dedicado ao campo). Só edição por `admin_master`/`admin_producao` (mesma regra da página).

**Extras (popover do card)**
- Em `src/components/extras/ExtraProdutoEditPopover.tsx`, adicionar acima das variações: input “Prazo (dias úteis)” persistindo `extra_produtos.lead_time_dias` via `useUpdateExtraProduto` (já aceita patch parcial).

### 5. Tipos e hooks

- Estender `ExtraProdutoDB` (em `useExtraProdutos.ts`) com `lead_time_dias: number`.
- `src/integrations/supabase/types.ts` é regenerado automaticamente após a migration; não editar à mão.

### 6. Não mexer

- Nada em pedidos antigos: sem backfill de `lead_time_snapshot`, sem recomputar prazos históricos.
- Regra `BOTA_25DU_CUTOFF` continua no código só como fallback dos pedidos antigos sem snapshot.
- Cutoff por horário (06h ficha / 12h extras), carimbo vinculado à bota e demais regras seguem intactos.

## Detalhes técnicos

- Grants: as duas tabelas já têm grants; `ALTER TABLE` não requer novos GRANTs.
- Sem novas policies necessárias — edição de `ficha_tipos`/`extra_produtos` já é restrita a admins pelas policies atuais.
- Migration incluirá `UPDATE` para popular `lead_time_dias` inicial de cada `ficha_tipos` (por slug) e de cada `extra_produtos` existente (por id).
