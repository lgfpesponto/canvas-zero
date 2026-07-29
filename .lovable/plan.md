## Objetivo

Nos pedidos criados a partir da página **Estoque** (que hoje aparecem na Composição do Pedido apenas como "Bota 1: Nome do Produto — Tam X · R$ 325,00" + eventuais extras), passar a exibir a **composição completa da ficha por item** (Modelo, Couro Cano/Gáspea/Taloneira, Solado, Cor Sola, Cor Vira, Formato Bico, etc.), agrupada como:

```
Item 1
  Modelo: Bota Bico Fino Perfilado        R$ 260,00
  Couro Cano: Látego Preto BF             R$ 35,00
  Solado: Couro Reta                      R$ 65,00
  ...
  ↳ Kit Faca                              R$ 70,00
  ↳ Adicionar Metais (Strass x3)          R$ 1,80
  Subtotal Item 1                         R$ 431,80

Item 2
  Modelo: Florência Off White             R$ ...
  ...
```

Da mesma forma que hoje já funciona a `Composição do Pedido` de uma bota feita pela ficha, e mantendo os "+ extras" com a setinha (↳) exatamente como já são desenhados.

## Onde o problema está hoje

- `OrderDetailPage.tsx` (bloco `case 'bota_pronta_entrega'`, linhas ~1060-1087) monta `extraPriceItems` com **uma única linha por bota** usando `b.valorManual`, ignorando a ficha.
- A RPC `comprar_estoque` salva `ficha_snapshot` **no nível do pedido** (`extra_detalhes.ficha_snapshot`), sobrescrevendo com o último produto do loop. Cada `bota` só recebe `sku`, `tamanho`, `estoque_produto_id`, `valorManual`, `extras`. Sem snapshot por bota não dá para reconstruir a composição por item quando o comprador escolhe tamanhos/produtos diferentes.
- O mesmo se aplica ao espelho da ficha (dialog "ESPELHO DA FICHA DE PRODUÇÃO") — hoje também mostra só a linha resumida.

## Passos

### 1. Backend — enriquecer o snapshot por bota

Nova migração `comprar_estoque(_items, _vendedor, _cliente, _whatsapp, _numero_pedido, _desconto_aplicado)`:
- Ao empurrar cada bota em `v_botas`, incluir também `'ficha_snapshot', v_row.ficha_snapshot` (snapshot da linha do produto/tamanho comprado — pode variar por tamanho) e `'nome_produto', v_row.nome`.
- Manter todo o resto igual (status `'Em aberto'`, cálculo de total, `desconto_aplicado`, GUC etc.).

### 2. Helper de precificação de bota de estoque

Criar `src/lib/estoqueOrderComposition.ts` com uma função `buildBotaComposicao(bota, findFichaPriceContextual, getCorSolaPrecoContextual, extraProdutos)`:
- Lê `bota.ficha_snapshot` (modelo, solado, formato_bico, cor_sola, cor_vira, tipo/cor de couro cano/gáspea/taloneira).
- Para cada campo preenchido, gera uma linha `[label, preco]` usando o mesmo cascateamento já usado em `OrderDetailPage` (`findFichaPriceContextual` da versão atual da ficha, `getCorSolaPrecoContextual` para a regra Marrom+Borracha, hardcoded fallbacks quando faltar).
- Devolve `{ linhas: [label, preco][], subtotalFicha: number }`.

Justificativa: a composição sempre reflete o **preço vigente da ficha na versão atualizada** — regra já combinada para produtos de estoque; o `valorManual` da bota continua servindo como preço congelado para o Total do pedido (via `desconto_aplicado` e ajustes já existentes), sem alterar o cálculo do total.

### 3. `OrderDetailPage.tsx` — renderizar composição por item

No `case 'bota_pronta_entrega'` (linhas ~1060-1087):
- Se `det.origem_estoque === true` (ou se qualquer bota tem `ficha_snapshot`), montar para cada bota:
  - Cabeçalho `Item N — <descricaoProduto>` (bloco visual com borda leve, como o "Item 1" do espelho).
  - Linhas de ficha (via helper do passo 2), cada uma com `InlineVariacaoOlhos` (mantém o "olhinho" para variações com foto).
  - Depois as linhas de extras existentes (`↳ Kit Faca`, `↳ Adicionar Metais…`) exatamente como já são.
  - Linha "Subtotal Item N" com a soma (ficha + extras) — usar o `valorManual` como âncora quando presente para não divergir do total.
- Se o pedido é de estoque antigo (bota sem `ficha_snapshot`), cair no comportamento atual (retrocompatível — nenhuma migração retroativa de dados).

### 4. Espelho da Ficha (`OrderPage.tsx` / dialog "ESPELHO DA FICHA DE PRODUÇÃO")

Mesma expansão no dialog `mirrorPriceItems` para pedidos de estoque: reutilizar o helper do passo 2 e renderizar Item N + composição + ↳ extras, mantendo o layout atual do espelho.

### 5. Fora do escopo (não mexer agora)

- PDFs de cobrança (`cobrancaPdf.ts`) e relatórios de produção — o usuário pediu apenas "na composição do pedido".
- Pedidos de estoque já existentes: sem `ficha_snapshot` por bota, permanecem no formato atual (não há como reconstruir com precisão o produto de cada unidade).

## Verificação

- Criar novo pedido pela página `/estoque` com 2 tamanhos diferentes + 1 extra "Adicionar Metais": abrir o detalhe e conferir que aparece Item 1 e Item 2, cada um com Modelo/Couro/Solado/…/↳ extras/Subtotal, e Total geral = soma dos subtotais.
- Abrir "Espelho da Ficha" no formulário e conferir mesma estrutura.
- Abrir um pedido de estoque antigo (pré-migração) e confirmar que continua exibindo o formato antigo (Bota 1: … + valorManual).