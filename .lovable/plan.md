
## Plano (6 ajustes pequenos e independentes)

Cada item abaixo é isolado. Posso aplicar todos juntos numa única passada de implementação.

---

### 1. Novo status de produção: **"Baixa Corte"**

**Onde:** `src/lib/order-logic.ts`

Adicionar `"Baixa Corte"` em:
- `PRODUCTION_STATUSES` (após `"Corte"`, antes de `"Sem bordado"`)
- `PRODUCTION_STATUSES_USER` (mesma posição)
- `PRODUCTION_STATUSES_IN_PROD` (continua contando como "em produção" para o dashboard)

Não mexe em banco — `orders.status` é texto livre, qualquer admin já pode setar via dropdown que lê dessa constante.

**Ficar atento:** confirmar que cabe nos relatórios filtrados por status (já usam a mesma constante).

---

### 2. Quantidade refletida em **Meus Pedidos** (Bota Pronta Entrega, Revitalizador, Kit 2 Revitalizadores)

**Problema atual** (`src/components/OrderCard.tsx` linha 44–45):
- O **valor** mostrado é `order.preco` puro pra qualquer extra (deveria multiplicar por quantidade nos casos de revitalizador unitário/kit; bota_pronta_entrega já tem botas embutidas).
- A **quantidade** mostrada (`Qtd:`) hoje só conta `extraDetalhes.botas.length` para `bota_pronta_entrega`; para revitalizadores mostra sempre `order.quantidade` (já correto).

**Correção:**
- Em `OrderCard.tsx`:
  - **Valor**: para `revitalizador` e `kit_revitalizador`, usar `order.preco * order.quantidade` (igual bota normal). Para `bota_pronta_entrega` continuar `order.preco` (preço já é total das botas no pedido). Demais extras: continua `order.preco`.
  - **Qtd**: para `bota_pronta_entrega` mostrar `extraDetalhes.botas.length || order.quantidade`. Para `revitalizador`/`kit_revitalizador` continua `order.quantidade`. Demais segue como está.

**"Total de Pedidos" → "Total de Produtos"** (`src/pages/ReportsPage.tsx` linhas 605–612):
- Renomear o label para **"Total de Produtos"**.
- Trocar `serverCount` (contagem de linhas) por **soma das quantidades reais dos pedidos filtrados**, considerando:
  - `bota` normal: `quantidade`
  - `bota_pronta_entrega`: `extraDetalhes.botas.length || quantidade`
  - `revitalizador` / `kit_revitalizador`: `quantidade`
  - demais extras / cinto: `quantidade` (geralmente 1)
- Implementação: estender `useOrders` (`src/hooks/useOrders.ts`) para também devolver `totalProdutos` calculado no mesmo SELECT auxiliar que já busca `preco, quantidade` (linhas 91–127 do hook), trazendo também `tipo_extra` e `extra_detalhes` para fazer a soma correta no cliente. Sem nova query.

---

### 3. Código de barras no **relatório de Bordados** (igual ao do Pesponto/Corte)

**Onde:** `src/components/SpecializedReports.tsx`

- **Bordados** (`generateBordadosPDF`, linhas ~893–909): hoje só renderiza QR da foto na coluna 2. Adicionar barcode (`orderBarcodeValue` + `barcodeDataUrl`, já importados) abaixo do número do pedido na coluna 0, mesmo padrão do Pesponto (linhas 670–675).
- **Corte** (`generateCortePDF`, linhas ~995–1011): aplicar o mesmo barcode na coluna do número do pedido. O usuário disse "igual o do pesponto e do corte também" — interpreto como "Bordados deve ter, e Corte também".

A altura da linha (`rowH`) já é `Math.max(20, …)` em ambos, dá folga pros 10mm do barcode.

---

### 4. Ficha impressa: canhoto **único** (só sola), mantendo estrutura geral

**Onde:** `src/lib/pdfGenerators.ts` linhas ~509–558 (bloco BOOT LAYOUT — stubs)

Hoje a ficha tem **3 canhotos** lado a lado: BORDADO/LASER, PESPONTO, e o terceiro com info de sola/forma + barcode.

**Mudança:** virar **1 canhoto só**, dividido visualmente em dois lados (ainda na mesma área `stubTop` até `ph - m`):
- **Lado esquerdo**: código de barras (igual ao terceiro stub atual) + número do pedido por baixo.
- **Lado direito**: as informações de **SOLA/MONTAGEM** que já existem no terceiro stub (`tamanho | solado | corSola | forma | bico | vira`).

Sem alterar:
- O resto da ficha (header, 3 colunas de categorias, linha tracejada de corte).
- O canhoto de cinto (já é 3 stubs específicos do cinto e o usuário não pediu mudança lá — confirmar mantemos como está).

Implementação: substituir as 3 chamadas de stub do bloco bota por uma única, com largura `pw - m*2`, dividida em 2 colunas (50/50).

---

### 5. **"Bola grande"** vira igual ao **Strass** (R$0,60 por unidade)

Hoje:
- "Bola grande" é uma seleção fixa de R$15 flat (1 unidade).
- "Strass" é R$0,60 × quantidade (input `qtdStrass`).

**Mudar Bola grande para o mesmo padrão do Strass**:
- Novo campo `qtdBolaGrande` (`extraDetalhes`) — input numérico aparece quando "Bola grande" estiver selecionado (espelhando a UI do Strass).
- Preço: `0.60 * qtdBolaGrande`.

**Arquivos afetados** (todos os locais com a lógica atual de R$15):
- `src/pages/ExtrasPage.tsx` (linhas 124, 532, 545–550, 650, 659–660): adicionar input `qtdBolaGrande` e trocar `total += 15` por `total += 0.60 * qtdBolaGrande`. Atualizar também o label do checkbox de `"Bola grande (R$ 15)"` para `"Bola grande (R$ 0,60/un)"`.
- `src/pages/EditExtrasPage.tsx` (linhas 65, 115, 407, 420, 536): mesma coisa, mais inicialização do `qtdBolaGrande` no `useEffect` de carregamento (`det.qtdBolaGrande || '1'`).
- `src/pages/OrderDetailPage.tsx` (linhas 240, 652, 679): trocar `t += 15` / `extraPriceItems.push(['Bola grande', 15])` por preço calculado com `qtdBolaGrande`. Mostrar também a quantidade na descrição (ex.: `Bola grande x12`).
- `src/components/SpecializedReports.tsx` (linhas 272, 286, 1205, 1222): mesma adaptação no breakdown dos relatórios.
- `src/lib/botaExtraHelpers.ts` (linha 41): atualizar cálculo `total += 0.60 * (qtdBolaGrande || 0)`.

**Compat com pedidos antigos:** se um pedido salvo tinha "Bola grande" sem `qtdBolaGrande`, tratar `qtdBolaGrande || 1` para manter `R$0,60` como mínimo (o valor antigo de R$15 fica congelado nos dados do pedido — `order.preco` no banco não é recalculado retroativamente). Sem migração de banco.

---

### 6. **Edição de cinto** abre página correta (não a de bota)

**Problema:** `OrderCard.tsx` linha 53 manda **cinto** para `/pedido/:id/editar` (rota do `EditOrderPage` que só conhece campos de bota). Já vi que a regra é `order.tipoExtra && order.tipoExtra !== 'cinto' ? extra : bota`.

**Solução:** criar **`src/pages/EditBeltPage.tsx`** espelhando o fluxo do `BeltOrderPage.tsx` (mesma estrutura visual, mesmos campos do `extraDetalhes` de cinto), com:
- Carrega o pedido via `useOrderById`.
- Preenche o form com `order.extraDetalhes` + nº pedido + cliente + observação + foto (drive).
- Recalcula preço com a mesma função do `BeltOrderPage`.
- `onSave`: `update` em `orders` salvando `extra_detalhes` + `preco` + recriando `historico`/`alteracoes` igual `EditOrderPage`.
- Suporta painel lateral de foto (`?foto=1`), igual `EditOrderPage`/`EditExtrasPage`.

**Routing**:
- Adicionar rota `<Route path="/pedido/:id/editar-cinto" element={<EditBeltPage />} />` em `src/App.tsx`.
- Em `OrderCard.tsx` linha 53, ajustar:
  ```ts
  const editPath = order.tipoExtra === 'cinto'
    ? `/pedido/${order.id}/editar-cinto`
    : order.tipoExtra
      ? `/pedido/${order.id}/editar-extra`
      : `/pedido/${order.id}/editar`;
  ```

Sem mudança de banco. `extra_detalhes` já guarda os campos de cinto.

---

## O que NÃO muda

- Banco (nenhuma migration).
- Edge functions.
- Dashboard, comissão, financeiro.
- Estrutura visual da ficha de bota (categorias e header continuam como estão).
- Canhoto da ficha de cinto (3 stubs BORDADO/PESPONTO/EXPEDIÇÃO permanecem).

## Arquivos editados

1. `src/lib/order-logic.ts` — novo status "Baixa Corte"
2. `src/components/OrderCard.tsx` — qtd e valor refletindo extras corretamente
3. `src/hooks/useOrders.ts` — devolver `totalProdutos` somando quantidades
4. `src/pages/ReportsPage.tsx` — label "Total de Produtos" usando `totalProdutos`
5. `src/components/SpecializedReports.tsx` — barcode em Bordados e Corte; ajuste preço Bola grande
6. `src/lib/pdfGenerators.ts` — canhoto único de bota (sola + barcode)
7. `src/pages/ExtrasPage.tsx` — campo `qtdBolaGrande`
8. `src/pages/EditExtrasPage.tsx` — campo `qtdBolaGrande`
9. `src/pages/OrderDetailPage.tsx` — exibição Bola grande com qtd
10. `src/lib/botaExtraHelpers.ts` — cálculo Bola grande
11. **`src/pages/EditBeltPage.tsx`** *(novo)*
12. `src/App.tsx` — rota `/pedido/:id/editar-cinto`

---

## Memória

Vou registrar **uma** memória nova: regra de **"Total de Produtos"** (ex‑"Total de Pedidos") em Meus Pedidos somar quantidades reais com a regra especial de `bota_pronta_entrega` (botas dentro de `extraDetalhes.botas`). É uma regra de negócio nova que pode confundir em ajustes futuros.

As demais mudanças são pontuais e auto‑evidentes lendo o código.
