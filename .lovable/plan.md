## Ajustes no fluxo Estoque

### 1. Botão "Estoque Pronto" ao lado dos ícones abaixo da foto

**Arquivo:** `src/components/FotoPedidoSidePanel.tsx`
- Adicionar props opcionais `onEstoquePronto?: () => void` e `showEstoquePronto?: boolean`.
- Renderizar um terceiro botão circular verde (esmeralda) com ícone `Package` (lucide), no mesmo grupo dos botões olho/documento, só quando `showEstoquePronto && onEstoquePronto` estiverem definidos.
- Estilo: `h-14 w-14 rounded-full` verde com hover consistente, tooltip "Criar direto no Estoque".

**Arquivos:** `src/pages/OrderPage.tsx` e `src/pages/BeltOrderPage.tsx`
- Passar `showEstoquePronto={vendedorSelecionado === 'Estoque'}` e `onEstoquePronto={() => { setEstoquePronto(true); formRef.current?.requestSubmit(); }}` para o `FotoPedidoSidePanel`.
- Manter o botão grande do rodapé como redundância.

### 2. Compras de estoque entram como "Em aberto"

**Migration:** atualizar as RPCs `public.comprar_estoque(...)` e `public.comprar_estoque_bagy(...)` para inserir `status = 'Em aberto'` no lugar do atual `'Pendente'`, com a entrada correspondente no `historico`. Assim toda compra vinda do site ou do estoque cai direto no fluxo normal de produção.

### 3. Excluir produto inteiro do Estoque (admin_master / admin_producao)

**Migration:** nova RPC `public.excluir_estoque_produto_completo(_sku_base text)` protegida por `has_role(auth.uid(),'admin_master') OR has_role(auth.uid(),'admin_producao')` que:
- Marca `ativo = false` em todos os `estoque_produtos` com o mesmo `sku_base` (todos os tamanhos).
- Libera pedidos ligados (mesma lógica de `excluir_estoque_produto`).
- Registra a exclusão em `estoque_ajustes_log`.

**Arquivo:** `src/pages/EstoquePage.tsx`
- Botão "Excluir produto" (ícone `Trash2` vermelho) no cabeçalho de cada card de produto agrupado, visível só para admin_master/admin_producao, com confirmação forte.

### 4. Sincronização com a Bagy pelo SKU

**Diagnóstico:** hoje a fila real usada por `bagy-stock-sync` é `bagy_stock_sync_queue`, mas as rotinas novas ("estoque pronto", ajuste manual) só enfileiram em `estoque_bagy_sync_pendente`. Resultado: SKUs novos não chegam à edge function e não sobem para a Bagy.

**Migration:**
- Ampliar o trigger `trg_estoque_marca_pendente_bagy` (em `estoque_produtos`) para **também** inserir/atualizar `bagy_stock_sync_queue` com a `quantidade` atual em todo INSERT/UPDATE de `quantidade`, com `onConflict(estoque_produto_id)` para não duplicar.
- Cobrir os deltas gerados por `ajustar_estoque_manual`, `criar_estoque_produto` e `comprar_estoque`.
- SKU enviado = `sku_base` exato (a edge function `bagy-stock-sync` já faz o lookup por SKU idêntico).
- Backfill single-shot: enfileirar todos `estoque_produtos` ativos que ainda não sincronizaram.

**Arquivo:** `src/components/estoque/BagySyncPendingButton.tsx`
- Manter o botão manual, mas ao clicar chamar `bagy-stock-sync` **sem** `retry_produto_id` (drena a fila real em batch).
- Marcar `estoque_bagy_sync_pendente.sincronizado_em` apenas quando cada SKU volta como sucesso.

### 5. Badge "✓ Sincronizado com Bagy" — visibilidade

**Arquivo:** `src/pages/EstoquePage.tsx`
- Mensagens (verde/amarelo/vermelho) já são gated por `canSeeBagySync` (admin_master, admin_producao, vendedor_comissao). Manter.
- Só exibir "✓ Sincronizado com Bagy" quando **todos** os tamanhos tiverem `bagy_sync_status === 'ok'` **e** `bagy_sync_at` não nulo. Se algum estiver `null`/vazio, não mostrar nada (evita falso positivo antes da 1ª sync real).

### 6. Cancelamento vindo da Bagy propaga para o portal

**Arquivo:** `supabase/functions/bagy-webhook/index.ts`
- No trecho que trata `isRefund`/cancelamento (linha ~638), quando existir `pedidoExistente?.order_id_portal`:
  - Atualizar o pedido do portal para `status = 'Cancelado'`, definir `motivo_cancelamento = 'Cancelado na Bagy'` (ou motivo textual vindo do payload, se disponível), preservar `preco`/`quantidade` no snapshot conforme regra já existente para Cancelado.
  - Apendar uma entrada em `historico` com data/hora São Paulo, `de = status_atual`, `para = 'Cancelado'`, `motivo = 'Cancelado na Bagy'`, `usuario = 'Bagy (webhook)'`.
  - Registrar linha em `order_status_changes` para o pedido para manter o índice de mudanças em dia.
  - Não regride se o pedido já estiver `Cancelado` (idempotente). Não mexe em estoque (a reversão de estoque continua sendo decisão manual do admin, como já documentado no código).

### Detalhes técnicos

- **Sem mudanças** em PDFs, cálculo de preço, comissão, permissões existentes.
- **Realtime**: continuar ouvindo `estoque_produtos` e `estoque_bagy_sync_pendente`.
- **Idempotência**: todas as ações do webhook (cancelamento incluso) precisam ser seguras contra re-entrega — checar status atual antes de sobrescrever.
