## Resumo

Montar o lado emissor da sincronização Portal → Atacado, na ordem que o Atacado precisa pra primeira sincronização entrar limpa.

## Ordem de execução

1. **Cadastrar secrets** (vou usar `add_secret` com os dois nomes; valor do `ATACADO_SYNC_SECRET` já é o `a3f7c91e4b...0f29` que você passou; `ATACADO_SYNC_URL` = `https://project--fa3c3d6a-31d4-46ce-8d88-abb71c18bcc8.lovable.app/api/public/sync-variacoes`).
2. **Migration**:
   - tabela `atacado_sync_log` (id, source_kind, source_id, action, payload jsonb, status, http_status, erro, tentativas, created_at, finished_at) — RLS: SELECT só admin_master; INSERT/UPDATE via service_role; grants pra authenticated e service_role.
   - flag em `system_flags`: `atacado_sync_enabled` default true.
3. **Edge function `atacado-sync-proxy`** (verify_jwt=false; valida JWT do admin no código; anexa `x-sync-secret`; lote 200; grava log; retorna `{ ok, applied, errors }`).
4. **`src/lib/atacadoSync.ts`** com `mapVariacaoToAtacado`, `mapCustomOptionToAtacado`, `pushOps` (retry 3×) e `syncAllNow` — tudo respeitando o flag.
5. **Gatilhos** em `useAdminConfig.ts`, `useCustomOptions.ts` e `priceChangeGuard.ts` (desativar=delete, reativar=upsert; falha de sync não bloqueia).
6. **Painel** "Sincronização Atacado" em `/admin/configuracoes` (status, toggle, falhas com retry, botão **Sincronizar tudo agora** — desabilitado até você confirmar que o Atacado está respondendo).

## Ponto de pausa combinado

Depois do passo 3 (edge proxy deployada), eu **paro** e te aviso. Você pinga a rota do Atacado de lá pra confirmar que está OK, me responde "pode disparar", e só então:
- continuo passos 4–6;
- aperto **Sincronizar tudo agora** uma vez na sua frente.

## Mapeamento (já acordado)

```text
tamanho-genero-modelo          → (tamanho-genero-modelo, modelo)
tipos-couro                    → (couros, tipo)
couros / cores-couro           → (couros, cor)
solados / solados-visual       → (solados-visual, solado)
formato-bico                   → (solados-visual, bico)
cor-sola                       → (solados-visual, cor_sola)
cor-vira                       → (solados-visual, cor_vira)
cor-linha / cor-borrachinha / cor-vivo → (pesponto-visual, linha|borrachinha|vivo)
bordados-* + custom bordado_*  → (bordados-visual, cano|gaspea|taloneira)
recorte_*                      → (recortes-visual, cano|gaspea|taloneira)
laser-* + custom laser_*       → (laser-visual, laser_opcao)  [pool único, dedup por nome]
cor-glitter                    → (laser-visual, glitter_cor)
tipo-metal / cor-metal / area-metal / metais-visual → (metais-visual, tipo|cor|area|rebite_item)
acessorios / acessorios-visual → (acessorios-visual, acessorio)
carimbo / carimbo-visual       → (carimbo-visual, carimbo)
desenvolvimento*               → (desenvolvimento-visual, desenvolvimento)
extras-visual                  → (extras-visual, extra_cor|extra_bool)
```

Internas não enviadas: identificacao, sob-medida, foto-referencia, tamanhos, generos, modelos, adicional-visual, observacao-visual, estampa-visual, e textos livres. Cinto idem com `produto_tipo='cinto'`.

## Regras fechadas

- Portal = fonte da verdade. Atacado é receptor.
- Sem markup atacado agora (preço lá = preço daqui).
- Desativar aqui = DELETE lá; reativar = UPSERT.
- 268 registros antigos do Atacado (sem `source_id`) ficam intocados.

Aprova pra eu começar?
