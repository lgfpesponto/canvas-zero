# Melhorias no fluxo de Estoque

## 1. Pedido "Estoque já criado" (Faça seu Pedido / Grade)

Quando o vendedor selecionado for **Estoque**, exibir na ficha um toggle **"Estoque já criado"**. Quando marcado:

- **Não exige número de pedido** (bypass do `useCheckDuplicateOrder` e da validação obrigatória do campo).
- Na geração da **grade de tamanhos**, permitir salvar linhas com **quantidade 0** (hoje quantidade 0 é filtrada/bloqueada).
- Cada linha da grade cria/atualiza direto o item de estoque no tamanho correspondente, mesmo com qtd 0 (útil para pré-cadastrar tamanhos que ainda não têm peça pronta).
- Marca uma flag no pedido (`estoque_ja_criado = true`) para distinguir do fluxo tradicional via "Baixa Estoque".

Pedidos normais continuam com a regra atual: número obrigatório, sem qtd 0, fluxo via etapa Baixa Estoque.

## 2. Edição por tamanho na página Estoque

Reformular o `EstoqueProdutoConfigButton` (engrenagem) para operar em nível de **produto + tamanho**:

- **Nome do produto**: editar altera o registro existente, **nunca cria produto novo** (garantir UPDATE in-place mesmo quando o nome muda).
- **Grade de tamanhos** dentro do dialog, uma linha por tamanho:
  - Campo **SKU específico daquele tamanho** (editável, salvar por linha).
  - Campo **quantidade** com ajuste rápido (+/-, motivo).
  - Botão **"Redescobrir na Bagy"** por tamanho (dispara `bagy-stock-sync` só para aquele SKU/variante).
- Campo de preço manual removido daqui (ver item 3).

## 3. Preço: pedido vs. produto de estoque

Regra clara de versionamento:

- **Pedidos já criados** continuam respondendo à **versão da ficha na data da compra** (`preco_regra_versao` snapshot), como já acontece — nada muda.
- **Produtos de estoque** (linhas em `estoque_produtos`) passam a acompanhar sempre a **versão atual da ficha**:
  - Preço deixa de ser editável manualmente na engrenagem.
  - Ao listar/exibir na página Estoque e ao sincronizar com a Bagy, calcular o preço em tempo real usando o modelo/variações originais e as regras vigentes (`priceLookup` + versão atual da régua).
  - Quando a régua bumpar (`preco_regra_versao++`), disparar recalc + push para a Bagy dos produtos afetados. Pedidos antigos permanecem intocados.
  - Se o produto não tiver vínculo com uma ficha de origem (cadastro manual antigo), manter o preço armazenado como fallback e mostrar aviso "sem ficha vinculada".

## Detalhes técnicos

- Migração: `orders.estoque_ja_criado boolean default false`; RPC `criar_estoque_produto` aceita qtd 0 quando a flag for true.
- Migração: garantir SKU por tamanho em `estoque_produtos` (checar coluna existente; se necessário adicionar).
- Frontend:
  - `OrderPage` / grade: novo toggle + bypass de duplicidade + permitir qtd 0 apenas com a flag ligada.
  - `EstoqueProdutoConfigButton`: refatorar em duas seções (Dados do produto | Tamanhos), com ações por linha.
  - `EstoquePage`: exibir preço vivo (helper que resolve pela ficha atual, com fallback ao valor salvo).
- Edge `bagy-stock-sync`: aceitar `retry_produto_id + tamanho` para redescoberta pontual; ler preço vivo antes de push.
- Reaproveitar `invalidatePriceCache` / gatilho de bump para propagar mudanças aos produtos de estoque sem tocar em pedidos.

## Fora de escopo
- Não alterar preços de pedidos históricos (regra reforçada acima).
- Não mudar o fluxo de Baixa Estoque para pedidos normais.
