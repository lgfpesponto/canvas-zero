# Phase 3 — Criar estoque em massa pela lista de pedidos

## Objetivo
Permitir ao admin criar estoque de vários pedidos `vendedor=Estoque` direto da `OrderListPage`, com painel inline para preencher SKU/Nome dos pedidos antigos que ainda não têm esses campos — agrupando automaticamente por `numero` (mesma grade) para repetir SKU/Nome entre tamanhos.

## 1. Botão "Criar estoque" em massa na lista

### 1.1 Onde aparece
- `OrderPage` (lista) quando o filtro de status ativo é **"Baixa Estoque"** e o usuário é admin.
- Botão na barra de ações em lote (mesma área de "Mudar etapa em massa") rotulado **"📦 Criar estoque dos selecionados"**.
- Habilitado quando ≥1 pedido selecionado é `vendedor=Estoque` + `status=Baixa Estoque` + `estoque_baixado=false`.
- Ignora silenciosamente seleções que não sejam de Estoque (mostra contador "X de Y elegíveis").

### 1.2 Fluxo ao clicar
1. Particiona os selecionados em:
   - **prontos**: têm `sku_estoque` e `nome_produto_estoque` preenchidos.
   - **faltando**: falta SKU e/ou Nome.
2. Se houver `faltando` → abre painel inline `CompletarSkusBulkPanel` no topo da lista (não modal — quadro fixo acima dos cards, como pedido pelo usuário).
3. Se tudo estiver pronto → executa direto chamando `criar_estoque_produto` para cada id em paralelo (com limite de concorrência 4), com toast de progresso "X/Y criados".
4. Ao final mostra resumo (criados / falhas) e recarrega.

## 2. Painel `CompletarSkusBulkPanel`

### 2.1 Layout (quadro acima da lista)
```text
┌─ Complete SKUs e Nomes (N pedidos) ────────────── [Fechar] ┐
│ Grupo: Pedido #7E-AAAA0001 (3 tamanhos)                    │
│   SKU base: [_____________]   Nome: [________________]     │
│   ├─ tam 38  qtd 2  → SKU final: bota-...-38 (auto)        │
│   ├─ tam 39  qtd 1  → SKU final: bota-...-39 (auto)        │
│   └─ tam 40  qtd 2  → SKU final: bota-...-40 (auto)        │
│                                                             │
│ Grupo: Pedido #7E-AAAA0007 (1 tamanho)                     │
│   SKU base: [_____________]   Nome: [________________]     │
│   └─ tam 41  qtd 1                                          │
│                                                             │
│ [Cancelar]                    [Salvar e Criar Estoque →]   │
└────────────────────────────────────────────────────────────┘
```

### 2.2 Agrupamento automático
- Agrupa os "faltando" por `numero` (= mesma grade). Cada grupo recebe **um único campo SKU base + Nome**.
- SKU final por linha = `{skuBase}-{tamanho}` (sufixo automático), editável individualmente clicando no SKU final.
- Pré-preenche `Nome` com `nome_produto_estoque` do primeiro pedido do grupo que já tiver (caso parcial) ou com `modelo` do pedido.
- Pré-preenche `SKU base` se algum pedido do grupo já tiver `sku_estoque` (extrai a parte antes do `-{tamanho}`).
- Validação leve: avisa (não bloqueia) se SKU base colidir com outro produto já existente em `estoque_produtos` (mesma regra atual do `GradeEstoque`).

### 2.3 Ação "Salvar e Criar Estoque"
1. Faz `UPDATE orders SET sku_estoque, nome_produto_estoque` para cada pedido (em batch — uma chamada por grupo).
2. Junta os ids salvos com os que já estavam prontos.
3. Chama `criar_estoque_produto(_order_id)` para cada id em paralelo (concorrência 4).
4. Toast com progresso `X/Y` (reaproveita padrão de "Bulk Progress Feedback").
5. Erros individuais ficam listados no painel ao final (não derruba os que deram certo).

## 3. Detalhes técnicos

**Arquivos novos**
- `src/components/estoque/CompletarSkusBulkPanel.tsx` — quadro de preenchimento agrupado.
- `src/lib/criarEstoqueBulk.ts` — helper `criarEstoqueEmMassa(ids, onProgress)` com concorrência limitada e coleta de erros.

**Arquivos alterados**
- `src/pages/OrderPage.tsx` (ou `OrderListPage`) — botão na barra de ações em lote + montagem do painel.
- `src/hooks/useSelectedOrders.tsx` — sem mudanças; usa a seleção existente.

**Sem mudanças de schema**: reusa `criar_estoque_produto` RPC e GRANTs existentes; updates de SKU/Nome usam o RLS já vigente em `orders`.

**Permissões**: botão visível apenas para admin (mesma regra do `EstoqueAdminPanel`); `admin_producao` continua bloqueado.

## 4. Fora de escopo
- Edição de fotos em massa (segue usando `foto_pedido_url` existente).
- Reaproveitamento de SKU entre grades diferentes — cada grupo (numero) é independente; usuário copia/cola se quiser.

Confirma para eu seguir para a implementação?
