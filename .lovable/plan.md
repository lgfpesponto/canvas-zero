## Sincronização Portal → Atacado (variações e custom_options) — versão final

**Migration 1 aprovada** ✅ — tabela `atacado_variacao_sync_log` + flag `atacado_variacao_sync_enabled`.
**Secrets gravados** ✅ — `ATACADO_SYNC_URL`, `ATACADO_SYNC_SECRET`.

### Ajustes confirmados

1. **Stack**: edge function Supabase (Portal não é TanStack).
2. **Ordem `await` → `invoke`**: helpers só disparam o sync **depois** que o `await` do upsert/delete no banco retornar sem erro.
3. **Erro visível**: `invoke` rejeitado ou `ok:false` ⇒ `toast.error("Sincronização com Atacado falhou — ver log em configurações")` (4s) + `console.warn`. Sucesso fica silencioso.
4. **`relacionamento`**: enviado como JSON cru (variação + campo pai), sem resumir.
5. **Realtime**: roda **Migration 2** antes de ligar Realtime na UI — `ALTER TABLE ... REPLICA IDENTITY FULL` + `ALTER PUBLICATION supabase_realtime ADD TABLE atacado_variacao_sync_log`.
6. **Rate limit**: `syncAllNow()` em lotes de 10 com `await sleep(200)` entre lotes.

### Migration 2 (a aprovar antes do código)

```sql
ALTER TABLE public.atacado_variacao_sync_log REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.atacado_variacao_sync_log;
```

### Arquivos

**A criar**
- `supabase/functions/atacado-sync-proxy/index.ts` — auth: JWT admin_master OU header `X-Service-Token` = service_role (para chamadas internas/reenvio em lote). Insere linha em `atacado_variacao_sync_log` (pendente) → confere flag → POST `{base}/{kind}/{action}` com `X-Sync-Secret` e timeout 10s → atualiza log (status, http_status, response_body, tentativas++).
- `src/lib/atacadoSync.ts` — helpers `syncFichaVariacaoUpsert/Delete`, `syncCustomOptionUpsert/Delete`, `retrySyncFromLog(logId)`, `syncAllNow(onProgress)`. Cada um `try { invoke } catch { toast + warn }`, fire-and-forget (`void`).
- `src/components/admin/AtacadoSyncPanel.tsx` — UI da aba (switch flag, tabela do log com Realtime, filtros, "Reenviar" por linha, "Sincronizar tudo agora" com barra `X/Y`).

**A modificar**
- `src/hooks/useAdminConfig.ts` — disparo após sucesso em `useInsertVariacao`, `useUpdateVariacao`, `useDeleteVariacao`, `useBulkInsertVariacoes`. Busca contexto (ficha_tipo + categoria + campo) via lookup do cache do react-query ou query rápida; envia `relacionamento` cru.
- `src/hooks/useCustomOptions.ts` — disparo após sucesso em `addOption`, `updateOption`, `deleteOption` (e cada item do `bulkUpdatePreco`).
- `src/lib/priceChangeGuard.ts` — após uma `preco_mudanca` aplicada, dispara upsert para cada variação/custom_option afetada (lotes de 10 + 200ms).
- `src/pages/AdminConfigPage.tsx` — nova aba "sincronização atacado" só p/ `admin_master`, renderiza `<AtacadoSyncPanel />`.

### Contrato do payload

`ficha_variacao` upsert:
```ts
{
  source_id: variacao.id, source_origin: "portal",
  nome, preco_adicional, ordem, ativo,
  ficha_tipo: { id, slug, nome },
  categoria:  { id, slug, nome },
  campo:      { id, slug, nome, tipo, vinculo, relacionamento } | null,
  relacionamento: variacao.relacionamento ?? null   // JSON cru
}
```
`ficha_variacao` delete: `{ source_id }`.
`custom_option` upsert: `{ source_id, source_origin:"portal", categoria, label, preco }`.
`custom_option` delete: `{ source_id }`.

### UI — aba "sincronização atacado"

- Switch da flag global.
- Lista das últimas 200 linhas do log, ordem desc por `created_at`, atualizando via Realtime.
- Colunas: data/hora, kind, action, identificador, status (badge), HTTP, erro truncado, tentativas, botão "Reenviar" só em `erro`.
- Filtro por status + busca textual.
- "Sincronizar tudo agora" → `syncAllNow()` percorre `ficha_variacoes` ativos + `custom_options` em lotes de 10 com `sleep(200)` entre lotes, exibindo `X / Y`.

### Retry policy

Sem cron. Reenvio manual via UI. Idempotência fica no Atacado.

### Memória ao final

`mem://integrations/atacado-sync` — secrets, edge function, tabela de log, flag toggle, pontos de disparo, contrato do payload, Realtime, retry manual.
