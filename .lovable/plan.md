## Plano final — Integração Bagy (botão manual + Faturado)

Status confirmados pelos prints da Bagy (vou usar esses labels no mapa):

| Etapa portal              | Label Bagy             | Campos enviados            |
| ------------------------- | ---------------------- | -------------------------- |
| Pagamento aprovado        | `Pagamento aprovado`   | — (já vem assim)           |
| Em produção (ficha)       | `Em produção`          | —                          |
| Separado (estoque pronto) | `Separado`             | —                          |
| Faturado                  | `Faturado`             | `nf_numero` (ex: 003876/2) |
| Despachado                | `Despachado`           | `tracking_code`            |
| Entregue                  | `Marcar como entregue` | —                          |

> Códigos reais da API Dooca/Bagy (ex: `separated`, `invoiced`, `shipped`) ficam centralizados em `supabase/functions/bagy-status-push/status-map.ts`. Se a API rejeitar algum label exato, troco só os valores nesse arquivo.

### Implementação

1. **Migration**
   - Coluna `nf_numero TEXT` em `bagy_status_sync_queue`.
   - Coluna `bagy_last_sync_at TIMESTAMPTZ` + `bagy_last_sync_error TEXT` em `orders` (pra mostrar quando foi o último envio e se deu erro).
   - **Sem `pg_cron` / `pg_net`** — tudo manual.

2. **Edge function `bagy-status-push` (refatorada)**
   - Aceita `{ order_ids: string[] }` (modo manual).
   - Para cada `order_id`: lê `orders` + `nfe_notas` (join opcional), mapeia status portal → Bagy via `status-map.ts`, monta payload com `tracking_code`/`invoice_number` quando aplicável, chama `PUT https://api.dooca.store/orders/{bagy_order_id}`.
   - Retorna array `[{ order_id, ok, error? }]`.
   - Grava `bagy_last_sync_at` / `bagy_last_sync_error` no `orders`.

3. **UI — detalhe do pedido**
   - Se `order.bagy_order_id` existir: botão **"Atualizar status na Bagy"** na barra de ações.
   - Mostra timestamp do último sync abaixo do botão; se erro, badge vermelho + tooltip com a mensagem.

4. **UI — lista `/rancho-chique/pedidos`**
   - Checkbox por linha + selectAll.
   - Barra flutuante "Atualizar N na Bagy" quando há seleção.
   - Mostra progresso X/Y enquanto roda; toast final com sucesso/erro por pedido.
   - Coluna extra "Último sync Bagy" (relativo, ex: "há 5 min" ou "❌ erro").

5. **Faturado**
   - Quando o portal marca etapa "Faturado", busca número da NF mais recente em `nfe_notas` daquele `order_id` e envia junto.
   - Se não houver NF emitida ainda, botão fica desabilitado com tooltip "Emita a NF antes de marcar Faturado na Bagy".

6. **Tooltip explicativo** no botão: "Envia o status atual do portal pra Bagy agora. Use depois de mudar etapa, faturar ou despachar."

### Fora do escopo (decisão sua)
- Cron automático.
- Trigger DB de auto-enfileirar mudanças de etapa.

Tudo manual via botão, individual ou em lote.
