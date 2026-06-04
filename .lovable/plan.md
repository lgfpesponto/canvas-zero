Migration + secrets já aplicados. Falta deployar o código:

**1. `supabase/functions/fichas-receber/index.ts`** — incluir `atacado_pedido_id: payload.pedido.id ?? null` em `extra_detalhes` (3 edits pontuais: assinatura de `fichaToDbRow`, objeto `extra_detalhes`, e a chamada `planned.map(...)`).

**2. `supabase/config.toml`** — adicionar bloco `[functions.atacado-progress-dispatch]` com `verify_jwt = false`.

**3. `supabase/functions/atacado-progress-dispatch/index.ts`** (novo) — recebe `{order_id, etapa}` via pg_net, valida `x-internal-secret` contra `internal_config`, faz `POST https://atacado.7estrivos.com.br/api/public/producao-callback` com `Authorization: Bearer ${ATACADO_OUTBOUND_TOKEN}` e body `{numero_portal, etapa}`, grava em `atacado_progress_log` e atualiza `extra_detalhes.atacado_etapas_enviadas`/`falhas`.

Deploy automático após aprovação. Sem mudanças no frontend.
