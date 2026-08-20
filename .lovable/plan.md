# Estoque vendido duas vezes (site + Larissa) — auditoria e travas

## O que eu já verifiquei no banco

Produto: **SARA PERFILADO tam 36** (`sara-perfilado-36`).

Histórico reconstruído pelas filas de sincronização e pelos pedidos:

```text
14/08 19:10  saldo 5
16/08 18:10  venda site (RC-17869037046983)   -> 4   (sem registro visível)
17/08 21:11  venda site (RC-17870010227247)   -> 3   (sem registro visível)
18/08 12:03  venda Gabi  (4-74EST)            -> 2
18/08 12:29  venda Larissa (3-13EST)          -> 1
18/08 14:06  venda Larissa (3-14EST)          -> 0
```

Ou seja: **o abatimento funcionou** em todas as vendas. O portal deixou a Larissa comprar porque, na conta dele, ainda existiam 3 pares em 17/08 — mesmo que fisicamente só houvesse 1.

O saldo do portal subiu sozinho em pelo menos dois momentos (13/08: 7 -> 8; 14/08: 4 -> 5) **sem nenhuma venda cancelada e sem nenhum registro no log de ajustes**. Isso indica que o número de pares no portal está inflado, não que faltou baixa.

Causas prováveis dessa inflação (a confirmar como primeiro passo):
- "Criar produto de estoque" a partir de um pedido **soma** quantidade quando o SKU/tamanho já existe. Criar o mesmo produto duas vezes dobra o saldo, sem log.
- Alterações de quantidade feitas por funções internas (webhook Bagy, reconciliação, criação de produto) **não gravam** em `estoque_ajustes_log` — só ajustes manuais gravam. Hoje é impossível auditar de onde veio cada unidade.
- Pedidos criados pelo webhook da Bagy ficam com `estoque_produto_id` vazio e `estoque_baixado = false`, mesmo tendo consumido estoque. Nas telas eles não parecem baixa de estoque.

## O que fazer

### 1. Auditoria (primeiro passo, antes de qualquer trava)
- Trigger em `estoque_produtos` que grava **toda** mudança de quantidade em `estoque_ajustes_log` (antes, depois, delta, origem: venda portal / venda Bagy / criação de produto / reconciliação / ajuste manual / devolução, e o pedido relacionado quando houver).
- Com isso, rodar um levantamento dos SKUs cujo saldo subiu sem entrada justificada, para corrigir os saldos hoje inflados.

### 2. Rastreabilidade das vendas do site
- Nos pedidos criados pelo webhook da Bagy, preencher `estoque_produto_id` e `estoque_baixado = true` (a baixa já ocorre; só não fica registrada no pedido).
- Assim a tela de estoque e os relatórios mostram todas as saídas, inclusive as do site.

### 3. Trava contra venda de par inexistente
- Na criação de produto a partir de pedido, avisar quando o SKU+tamanho já existe e pedir confirmação explícita ("somar ao saldo existente" x "não somar"), em vez de somar silenciosamente.
- Antes de confirmar a compra no portal, checar o saldo real na Bagy para aquele produto (reconciliação pontual) e bloquear se a Bagy já estiver zerada — evita exatamente o caso do dia 18/08.

## Detalhes técnicos
- Nova trigger `AFTER UPDATE OF quantidade ON public.estoque_produtos` gravando em `estoque_ajustes_log`, lendo a origem de um `set_config` local (`app.estoque_origem`) definido por `comprar_estoque`, `comprar_estoque_bagy`, `criar_estoque_produto`, `devolver_estoque_pedido` e pela reconciliação.
- `supabase/functions/bagy-webhook/index.ts` + `comprar_estoque_bagy`: setar `estoque_produto_id` e `estoque_baixado` nos pedidos gerados.
- `supabase/functions/bagy-stock-reconcile/index.ts`: chamada pontual por produto no fluxo de compra (`EstoqueBuyDialog`), com fallback silencioso se a Bagy não responder.
- `criar_estoque_produto`: novo parâmetro `_permitir_somar` (default false) e mensagem clara na UI quando o SKU já existir.
