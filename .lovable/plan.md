# Phase 2 — Fluxo de compra do estoque + edição obrigatória + anti-colisão

## Objetivo
Permitir que qualquer vendedor (ou admin no nome de um vendedor) compre pares do Estoque pela página `/estoque`, gerando um pedido extra "Bota Pronta Entrega" com origem rastreável, e garantir que **dois vendedores nunca consigam vender o mesmo par** mesmo comprando ao mesmo tempo.

## 1. Anti-colisão (núcleo da fase)

**Regra:** a quantidade no `estoque_produtos` é a fonte única da verdade. Toda venda decrementa atomicamente no banco, com checagem dentro da transação, e a UI escuta em tempo real para refletir para todos.

### 1.1 RPC `comprar_estoque(_items jsonb, _vendedor text, _cliente text, _whatsapp text, _numero_pedido text)`
- `_items`: `[{produto_id, sku, tamanho, quantidade, preco_unit}]`.
- `SECURITY DEFINER`, `search_path=public`.
- Início: `BEGIN ... LOCK TABLE`/`SELECT ... FOR UPDATE` em cada `estoque_produtos.id` da lista (em ordem de id para evitar deadlock).
- Para cada item: se `quantidade_disponivel < quantidade_pedida` → `RAISE EXCEPTION 'ESTOQUE_INSUFICIENTE:<sku>:<tamanho>:<disponivel>'` (mensagem parseável no frontend para mostrar toast amigável).
- Decrementa `UPDATE estoque_produtos SET quantidade = quantidade - X WHERE id = ? AND quantidade >= X` e exige `FOUND` (segurança extra contra race).
- Cria 1 pedido na tabela `orders` com `tipo_extra='bota_pronta_entrega'`, `extra_detalhes.botas[]` (um item por par), `extra_detalhes.origem_estoque=true`, `det.estoque_origem_ids[]`, `det.foto_url`, `det.ficha_snapshot`, `vendedor`, `cliente`, `whatsapp`, `numero`, `preco` somado, `quantidade` total, `status='Pendente'` (mesmo fluxo dos demais extras).
- Retorna `{order_id, numero}`.

### 1.2 Realtime
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.estoque_produtos;`
- `EstoquePage` assina mudanças e atualiza grade ao vivo (quantidades caem para todos os usuários abertos).
- Se um card ficar com qtd 0 enquanto outro vendedor digita quantidade, o input cai para o máximo disponível e mostra aviso.

### 1.3 UX de erro de colisão
- Quando RPC retorna `ESTOQUE_INSUFICIENTE`, o dialog destaca a linha em vermelho com "Acabou de ser vendido por outro vendedor — restam X", reduz o valor e reabilita o botão Finalizar (não fecha o dialog, não cria pedido).

## 2. Página Estoque — botão Comprar 🛒

### 2.1 `EstoqueBuyDialog.tsx` (novo)
Reaproveita o layout do formulário "Bota P.E." de `ExtrasPage`:
- Cabeçalho fixo: foto + nome do produto + SKU base.
- Lista de tamanhos disponíveis com input de quantidade (limitado a `quantidade` atual).
- Botão `+ Outro tamanho` adiciona linha.
- Campo "Vendedor" (auto = usuário logado para vendedor; selecionável quando admin), "Cliente", "WhatsApp" — mesmas regras dos pedidos extras.
- Preço unitário pré-preenchido com `estoque_produtos.preco`, editável (mantém regra "edição de valor").
- Rodapé: total, botão **Finalizar compra**.

### 2.2 Botão 🛒 no card
- Disponível para vendedor, vendedor_comissao e admin (mesma regra de Extras / Faça seu pedido).
- Desabilitado se `SUM(quantidade) = 0` em todos os tamanhos.

## 3. Edição obrigando SKU + Nome (vendedor=Estoque)

### 3.1 `EditOrderPage.tsx` e `EditBeltPage.tsx`
- Ao salvar: se `vendedor === 'Estoque'` e (faltam SKUs em alguma linha da grade **ou** `nome_produto_estoque` vazio), abre modal bloqueante "Complete os SKUs e o nome do produto antes de salvar" (mesma UI do GradeEstoque) e impede commit.
- Ao **mudar** vendedor para `Estoque` em uma edição: mesmo modal força preenchimento na hora.
- Ao mudar vendedor **de** `Estoque` para outro: limpa `sku_estoque`/`nome_produto_estoque` apenas se `estoque_baixado=false` (se já baixou, bloqueia troca de vendedor — coerente com o lock atual).

### 3.2 Dialog "Completar SKUs faltantes" (bulk)
- Botão na `EstoquePage` (admin) ou em `OrderListPage` filtrando `vendedor=Estoque AND sku_estoque IS NULL`.
- Lista pedidos antigos sem SKU, permite preencher em lote antes do "Criar estoque".

## 4. OrderDetailPage — origem Estoque

Quando `tipoExtra='bota_pronta_entrega'` e `det.origem_estoque===true`:
- Substitui placeholder de foto por `det.foto_url`.
- Mostra QR + botão "Escanear" invisível (mesma UX do Estoque).
- Itens de composição (couro/sola/bordado do `ficha_snapshot`) renderizados × `quantidade` da bota.
- Mostra bloco "Detalhes" com `ficha_snapshot` mesmo quando vários pares.
- Histórico de produção começa zerado (já está em `Pendente`).

## 5. Detalhes técnicos

**Arquivos novos**
- `supabase/migrations/<ts>_comprar_estoque_rpc.sql` — função + `ALTER PUBLICATION` realtime.
- `src/components/estoque/EstoqueBuyDialog.tsx`
- `src/components/estoque/CompletarSkusDialog.tsx`

**Arquivos alterados**
- `src/pages/EstoquePage.tsx` — botão 🛒, realtime, integração do buy dialog.
- `src/pages/EditOrderPage.tsx`, `src/pages/EditBeltPage.tsx` — guards de SKU/Nome.
- `src/pages/OrderDetailPage.tsx` — render foto/composição/ficha para origem estoque.
- `src/lib/estoqueHelpers.ts` — helper `comprarEstoque(items, dadosVendedor)` chamando a RPC e tratando erros.

**RLS / permissões**
- RPC roda como `SECURITY DEFINER`; valida `auth.uid()` e papel (vendedor/comissao/admin). Bloqueia `admin_producao` (regra existente).
- Mantém GRANTs já criados em `estoque_produtos`.

## 6. Fora do escopo desta fase
- Devolução/estorno de compra de estoque (retornar pares ao estoque) — pode virar Phase 3 se necessário.
- Histórico financeiro vinculando venda ao saldo do revendedor — usa o fluxo existente de `Cobrado`/`Pago` já implementado.

Confirma para eu seguir?
