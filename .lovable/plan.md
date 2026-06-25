# Estoque: SKU, Nome do Produto, Criação de Estoque e Página de Venda

Nova feature ponta-a-ponta para transformar pedidos de grade do vendedor **Estoque** em produtos vendáveis numa página `/estoque`, com SKU, nome do produto, agrupamento por SKU e fluxo de compra estilo "Bota Pronta Entrega".

## 1. Banco (migration única)

Colunas novas em `public.orders`:
- `sku_estoque text` — SKU por pedido (por tamanho).
- `nome_produto_estoque text` — nome que aparecerá na vitrine.
- `estoque_produto_id uuid` — preenchido quando vira produto (FK para `estoque_produtos.id`).
- `estoque_baixado boolean default false` — marca quando entrou no estoque.

Nova tabela `public.estoque_produtos`:
- `nome`, `sku_base text` (SKU compartilhado de um tamanho — chave de junção), `tamanho text`, `quantidade int`, `preco numeric`, `foto_url text`, `ficha_snapshot jsonb` (cópia dos campos da ficha que viraram filtros: modelo, tipo couro, tipo solado, bico, etc.), `criado_por`, timestamps.
- Índice único `(sku_base, tamanho)` → garante o "junta SKUs iguais somando quantidade".

GRANTs: `SELECT, INSERT, UPDATE, DELETE` para `authenticated`; `service_role ALL`. RLS: vendedores leem tudo, escrita só admins (estoque) / vendedores podem comprar (criar pedido = já é via `orders`).

## 2. Fluxo no `OrderPage` / `BeltOrderPage` (Faça seu pedido — bota e cinto)

Quando `vendedor === 'Estoque'`:
- **Esconde** os campos Cliente e WhatsApp.
- **Mostra** campo "Nome do produto" — se há `modelo` selecionado, pré-preenche com o nome do modelo (editável).
- Na `GradeEstoque`: cada linha (tamanho × quantidade) ganha um campo **SKU**.
  - Sugestão automática: `{modelo-slug}-{tamanho}` (editável).
  - Validação 1: SKUs iguais para tamanhos diferentes da mesma grade → bloqueia.
  - Validação 2: SKU já existe em `estoque_produtos` com outro `nome` → toast amarelo "SKU já usado por X — confirmar reposição?" (não bloqueia).
- Ao gerar a grade, cada pedido recebe `sku_estoque` e `nome_produto_estoque` (mesmo nome para todos da grade, SKU igual entre pedidos do mesmo tamanho).

## 3. Edição de pedido para vendedor Estoque

Em `EditOrderPage` / `EditBeltPage`: ao trocar o vendedor para `Estoque`, força modal preenchendo SKU + Nome do produto antes de salvar. Sem SKU não persiste.

## 4. Status "Baixa Estoque" + botão "Criar Estoque"

Em `src/lib/statusTransitions.ts`: já existe "Baixa Estoque" para grade. Em `OrderDetailPage`:
- Quando `etapa === 'Baixa Estoque'` e `sku_estoque` preenchido → botão **"Criar estoque"**.
- Sem SKU → botão fica desabilitado e mostra "Preencher SKU" (abre dialog).
- Para pedidos antigos sem SKU: nova ação em massa **"Completar SKUs faltantes"** acessível a admin (lista pedidos sem SKU em Baixa Estoque com inputs em massa).
- Ao clicar "Criar estoque": upsert em `estoque_produtos` por `(sku_base, tamanho)` somando `quantidade`. Preço = valor final atual da ficha do pedido. Foto = `foto_pedido_url`. `ficha_snapshot` = campos relevantes do pedido. Marca `orders.estoque_baixado = true` e grava `estoque_produto_id`.

Após criado: status fica travado (não permite mover de etapa, só excluir). Implementar bloqueio em `statusTransitions.ts` quando `estoque_baixado = true`.

## 5. Nova página `/estoque`

Rota `EstoquePage` em `src/pages/EstoquePage.tsx`, adicionada no `App.tsx`. Acesso: mesma regra de Extras/OrderPage (vendedor, vendedor_comissao, admins). Link no `Header.tsx`.

Layout:
- Topo: busca por **nome ou SKU**.
- Filtros (chips multi-select):
  - Por numeração (33–46).
  - "Filtros da ficha" → botão que abre painel com: Modelo, Tipo de Couro, Tipo de Solado, Cor, etc. (opções derivadas distintas de `ficha_snapshot`).
- Grid de cards:
  - Foto em destaque com **botão invisível "Escanear" sobreposto sempre focado** (mesmo pattern dos pedidos com QR — usar `autoFocus` + `opacity-0` cobrindo o QR).
  - Nome do produto abaixo.
  - Linha de tamanhos disponíveis: `34 (12)` `35 (8)` com SKU pequeno discreto.
  - Botões inferiores: 👁 (modal de visão expandida com foto grande, ficha_snapshot, todos os SKUs) e 🛒 (abre fluxo de compra).

## 6. Fluxo de compra (botão carrinho)

Drawer/dialog estilo `ExtrasPage` → "Bota Pronta Entrega":
- Passo 1: selecionar tamanhos + quantidade (limitado ao disponível).
- Passo 2: formulário como `bota_pronta_entrega`:
  - Vendedor (admin pode trocar), Nº pedido, Cliente opcional, WhatsApp opcional.
  - Cada par vira um item `BotaPEItem` com:
    - `descricao` = nome do produto (não editável).
    - `valor` = preço do produto (editável, igual hoje).
    - `quantidade = 1`.
    - Botão **+ Extra** idêntico ao Bota P.E. atual.
  - Salva como pedido `tipoExtra = 'bota_pronta_entrega'` com flag adicional `det.origem_estoque = true`, `det.estoque_produto_id`, `det.foto_url`, `det.ficha_snapshot`.
- Ao finalizar: decrementa `quantidade` na linha correspondente de `estoque_produtos` (transação por SKU+tamanho). Se chegar a 0, mantém registro mas oculta da vitrine.

## 7. Visão do pedido gerado pela compra

Em `OrderDetailPage`, quando `tipoExtra === 'bota_pronta_entrega'` e `det.origem_estoque`:
- Acima da composição (igual Bota P.E. atual), substitui o quadrado vazio da foto por `<img src={det.foto_url}>` com QR ao lado + botão "Escanear" invisível autofocado (mesmo componente dos pedidos de ficha).
- Composição: itens multiplicados por quantidade igual à Bota P.E. atual; bloco "Detalhes" único exibindo `ficha_snapshot` (modelo, couro, solado…) ainda que sejam vários pares (mesmo modelo).
- Edição de valor, histórico e demais ações = padrão Bota P.E. Histórico de produção começa do zero (não puxa do pedido original).

## 8. Regras finais (recap implementadas)

- Estoque criado → pedido original só pode ser excluído (sem trocar etapa).
- Trocar vendedor para Estoque em edição → obriga SKU.
- Pedidos antigos em Baixa Estoque sem SKU → tela em massa "Completar SKUs".
- SKUs iguais somam quantidade no mesmo `estoque_produtos` mesmo vindo de grades diferentes (reposição). Sugere nome do produto pelo SKU existente.

## Detalhes técnicos

**Arquivos a criar:**
- `supabase/migrations/<ts>_estoque_produtos.sql`
- `src/pages/EstoquePage.tsx`
- `src/components/estoque/EstoqueProductCard.tsx`
- `src/components/estoque/EstoqueBuyDialog.tsx`
- `src/components/estoque/CompletarSkusDialog.tsx`
- `src/lib/estoqueHelpers.ts` (upsert por SKU, decremento na compra, sugestão de SKU/nome)

**Arquivos a alterar:**
- `src/App.tsx` (rota /estoque), `src/components/Header.tsx` (link).
- `src/components/GradeEstoque.tsx` (campos SKU por linha + validações).
- `src/pages/OrderPage.tsx`, `src/pages/BeltOrderPage.tsx` (esconder cliente/whats, campo nome do produto, passar SKU para criação).
- `src/pages/EditOrderPage.tsx`, `src/pages/EditBeltPage.tsx` (modal SKU obrigatório ao virar Estoque).
- `src/pages/OrderDetailPage.tsx` (botão "Criar estoque", trava etapa pós-estoque, render Bota P.E. com foto/ficha quando `origem_estoque`).
- `src/lib/statusTransitions.ts` (bloquear transições quando `estoque_baixado`).
- `src/pages/ExtrasPage.tsx` reuso: extrair lógica do form Bota P.E. em componente compartilhado consumido por `EstoqueBuyDialog`.

Sem outras mudanças de design ou regras de negócio fora desse escopo.
