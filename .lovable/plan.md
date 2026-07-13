## Contexto

Hoje o fluxo é:

- **Venda no site Rancho Chique (Bagy)** → Bagy decrementa o próprio estoque → dispara webhook → `comprar_estoque_bagy` decrementa `estoque_produtos.quantidade` no portal → trigger `trg_estoque_push_bagy` enfileira `bagy-stock-sync` → sync faz `PUT /balance` mandando o saldo local pra Bagy.
- **Venda no portal** → `comprar_estoque` decrementa local → mesmo trigger enfileira sync → PUT manda saldo pra Bagy.

O `PUT /balance` é **absoluto** (não é delta), então em teoria não gera "duplo decremento". Mesmo assim há três problemas reais a resolver:

1. **Eco desnecessário Bagy → Portal → Bagy.** Toda venda Bagy hoje re-empurra o saldo pra própria Bagy. Consome cota da API, aparece no log como sync, e — mais grave — abre janela de sobrescrita: se um vendedor no portal vender **entre** o webhook e o sync sair, o PUT pode carimbar um saldo desatualizado por cima do saldo já correto na Bagy.
2. **Race entre vendedores no portal.** `comprar_estoque` já tem `SELECT … FOR UPDATE` + `WHERE quantidade >= v_qtd` — o banco não deixa oversell. Mas dois vendedores clicando "Confirmar compra" na mesma unidade recebem um "ESTOQUE_INSUFICIENTE" no segundo clique com mensagem crua, e a UI ainda mostrava "1 disp." pros dois. Falta feedback bom + uma reserva curta pra evitar corrida na UI.
3. **Divergência silenciosa.** Se por qualquer motivo Bagy e portal divergirem (edição manual, produto novo, erro de sync antigo), nada avisa. A regra do usuário é: **estoque da Bagy = estoque do portal, sempre**. Precisa de reconciliação periódica.

## O que fazer

### 1. Marcar origem da baixa e pular sync quando a origem é Bagy
- Em `comprar_estoque_bagy`, antes do `UPDATE estoque_produtos SET quantidade = quantidade - v_qtd`, setar uma GUC de sessão (`SET LOCAL app.skip_bagy_push = 'on'`).
- Alterar o trigger `enfileirar_bagy_stock_sync` para ler essa GUC e retornar sem enfileirar quando estiver ligada.
- Resultado: venda Bagy só decrementa local; **não** faz PUT de volta. Venda portal continua enfileirando normalmente.

### 2. Reconciliação Bagy → Portal (fonte de verdade quando divergir na venda)
- Nova função Edge `bagy-stock-reconcile` (cron a cada 15 min + botão manual admin_master na aba Gestão).
- Para cada `estoque_produtos` ativo com `bagy_variation_id`: `GET /products/variations/{id}` na Bagy, comparar `balance` com `quantidade` local.
- Regra de resolução:
  - **Se local > Bagy**: puxar pra baixo (`quantidade = balance` da Bagy) — assume que Bagy vendeu algo que ainda não chegou por webhook. Priorizar Bagy conforme pedido do usuário.
  - **Se local < Bagy**: puxar Bagy pra baixo (PUT balance = quantidade local) — venda portal foi feita e sync falhou; portal é fonte de verdade pra vendas internas.
  - **Se igual**: nada.
- Log em `bagy_stock_reconcile_log` (nova tabela: `produto_id, sku, saldo_local_antes, saldo_bagy_antes, acao, saldo_final, executado_em`).

### 3. Lock atômico anti-race na compra pelo portal
- Já existe `FOR UPDATE` + guard no `UPDATE`. Adicionar tratamento de erro amigável no `EstoqueBuyDialog`:
  - Quando RPC retorna `ESTOQUE_INSUFICIENTE:sku:tamanho:qtd_disp`, mostrar toast: "Outro vendedor acabou de comprar este item. Restam N un. do tamanho X." e recarregar a lista de tamanhos automaticamente.
- Adicionar `SELECT quantidade FROM estoque_produtos WHERE id IN (...) FOR SHARE` numa **reserva otimista** de 30 s: nova tabela `estoque_reservas (produto_id, user_id, quantidade, expira_em)`. Ao abrir o dialog e escolher quantidades, criar reserva; ao confirmar/cancelar/timeout, liberar. `comprar_estoque` desconta a reserva do próprio usuário na hora do commit.
- Realtime: cada mudança em `estoque_produtos.quantidade` OU em `estoque_reservas` reflete em tempo real no dialog aberto (via `postgres_changes`) — o usuário vê "1 disp." virar "esgotado" antes de clicar.

### 4. UI/monitoramento
- Na aba **Gestão** (admin_master), novo card "Sincronização Bagy":
  - Contador de queue pendente, último sync ok, último erro.
  - Botão "Reconciliar agora" (chama `bagy-stock-reconcile`).
  - Botão "Ver divergências" abre modal com últimas linhas de `bagy_stock_reconcile_log` onde `acao <> 'sem_diferenca'`.
- No `EstoqueAdminPanel`, badge "Divergente" no produto quando `saldo_local ≠ saldo_bagy` (último reconcile).

### 5. Testes
- Deno test em `bagy-stock-reconcile`: mock GET/PUT, cobrir os 3 caminhos (local>bagy, local<bagy, igual).
- Cenário manual: rodar o script de compra concorrente com 2 sessões no dialog, confirmar toast + refresh na segunda.

## Detalhes técnicos

Arquivos afetados:

- `supabase/migrations/<nova>.sql`
  - Alterar `enfileirar_bagy_stock_sync` pra checar `current_setting('app.skip_bagy_push', true) = 'on'`.
  - Alterar `comprar_estoque_bagy` pra emitir `PERFORM set_config('app.skip_bagy_push', 'on', true)` antes dos UPDATEs.
  - Criar tabela `bagy_stock_reconcile_log` + GRANTs + RLS (só admin_master lê).
  - Criar tabela `estoque_reservas` + GRANTs + RLS + função `reservar_estoque(_produto_id, _qtd)` / `liberar_reserva(_id)` / `purge_reservas_expiradas()`.
  - Ajustar `comprar_estoque` pra abater reservas do próprio `auth.uid()`.
- `supabase/functions/bagy-stock-reconcile/index.ts` — nova função + `supabase/config.toml` cron `*/15 * * * *`.
- `src/components/estoque/EstoqueBuyDialog.tsx` — reserva ao mudar quantidade, liberação no unmount, tratamento de `ESTOQUE_INSUFICIENTE`, subscribe Realtime.
- `src/components/gestao/BagySyncStatusCard.tsx` (novo) montado em `GestaoPage.tsx`.
- `src/components/estoque/EstoqueAdminPanel.tsx` — badge "Divergente".

Sem alteração em `bagy-webhook` nem em `bagy-stock-sync` além do efeito indireto do GUC.

## Fora do escopo

- Não muda a regra "PUT balance absoluto" — continua sendo a mecânica de sync.
- Não cria fila delta / event sourcing de estoque — o portal segue com saldo pontual, reconciliação cobre divergências.
