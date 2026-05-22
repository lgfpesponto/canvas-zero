# Turbinar a IA admin_master: conciliação financeira, PDF×portal e planos salvos

## Objetivo

Hoje o chat do admin_master já consulta pedidos, vendedores, alterações, saldos e preços. Falta o que a Juliana realmente precisa: **conciliar financeiro de um revendedor**, **explicar diferença entre PDF de cobrança e portal** e **salvar planos** para reusar depois.

## O que vai mudar

### 1. Novas tools na edge function `admin-assistant`

**`conciliacao_financeira_revendedor(vendedor, de?, ate?)`**
Retorna num único pacote: saldo atual, todos comprovantes do período (com status), todas baixas geradas, pedidos Cobrados/Pago/Entregue do vendedor no período, total enviado vs total baixado vs em aberto. É a tool para responder "por que o financeiro do Rafael não está batendo".

**`comparar_pdf_snapshot(snapshot_id?, tipo?, de?, ate?)`**
Lê `pdf_snapshots` (já existe), pega o snapshot mais recente ou por id, e compara `totais` gravados no snapshot com a soma ATUAL dos `order_ids` no banco. Lista pedidos cujo `preco` mudou desde a geração do PDF, com diferença. É a tool para "por que o PDF não bate com o portal".

**`verificar_preco_pedido(numero)`**
Recalcula o subtotal esperado do pedido pelas regras vigentes (mesma lógica de `recomputeSubtotal`/`computeTotalToSave` embutida server-side via lookup em `ficha_variacoes` + `custom_options` + fallbacks) e compara com `orders.preco`. Mostra o breakdown item a item e marca itens que caem no fallback hardcoded. Pega bugs como o da Florência.

**`salvar_plano(titulo, conteudo, tags?)` + `listar_planos(busca?)` + `obter_plano(id)` + `apagar_plano(id)`**
Persiste planos de investigação/ação que a IA gera ou que a admin pede pra guardar. Markdown livre.

### 2. Nova tabela `admin_assistant_planos`
Colunas: `id`, `titulo`, `conteudo` (texto markdown), `tags` (text[]), `created_by`, `created_at`, `updated_at`. RLS: só admin_master vê/edita/apaga os próprios.

### 3. UI no `AdminAssistantPanel`
- Nova aba/botão **"Planos salvos"** ao lado de "Histórico", abrindo lista de planos com busca por título/tag.
- Clique no plano → abre em modal markdown com botões "Copiar", "Mandar pro chat" (cola o conteúdo no input) e "Apagar".
- Quando a IA usa a tool `salvar_plano`, a mensagem mostra um chip clicável "Plano salvo: <título>" que abre o modal.

### 4. Atualização no `SYSTEM_PROMPT`
- Instruir a IA a usar `conciliacao_financeira_revendedor` quando perguntarem sobre financeiro/baixas/diferença de saldo.
- Usar `comparar_pdf_snapshot` quando falarem em PDF, cobrança impressa, ou "valor não bate".
- Usar `verificar_preco_pedido` quando suspeitarem de preço errado em pedido individual.
- Quando a admin pedir "salva isso como plano", "guarda esse roteiro", chamar `salvar_plano` automaticamente com um título curto.

## Resultado esperado

Juliana abre o chat e pergunta:
- *"Por que o financeiro do Rafael Silva não bate em maio?"* → IA chama `conciliacao_financeira_revendedor("Rafael Silva", "2026-05-01", "2026-05-31")` e responde com saldo, comprovantes, baixas, em aberto, divergências.
- *"Por que o PDF de cobrança do Rafael deu R$ 24.451 e o portal mostra R$ 24.446?"* → IA chama `comparar_pdf_snapshot` e identifica os pedidos que mudaram de preço entre a geração e agora.
- *"Salva esse roteiro pra eu rodar toda semana"* → IA chama `salvar_plano`, plano aparece na aba "Planos salvos".

## Detalhes técnicos

- Migração cria tabela + RLS (`USING has_role(auth.uid(), 'admin_master')`).
- Tools server-side usam service role (já é o padrão da edge function).
- `verificar_preco_pedido` precisa portar a lógica de `recomputeOrderPrice.ts` para Deno. Vai ficar embutida na edge function (cópia da função, não import — runtime separado).
- Limite de iterações de tool (`MAX_TOOL_ITER = 8`) sobe para 12 para investigações encadeadas.
