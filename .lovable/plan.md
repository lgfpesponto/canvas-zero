# Plano

## 1. Scanner em massa — separar pedidos sem trava dos com trava

**Comportamento atual** (`src/pages/ReportsPage.tsx`, `handleBulkProgressUpdate`):
Quando há qualquer pedido travado (retrocesso/pausa/cancelamento) na seleção, TODO o lote (incluindo os pedidos sem trava, ex: "Entregue" indo para "Cobrado") fica parado esperando o admin justificar os travados no modal único. Se ele cancelar, ninguém é movido.

**Comportamento desejado**:
- Pedidos sem trava são atualizados imediatamente para a nova etapa (silenciosamente, com toast de sucesso).
- Pedidos com trava aparecem num modal separado depois, com a lista, o tipo de trava (retrocesso/pausa/cancelamento) e o fluxo "Tem certeza? → Justificativa" para o lote travado.
- Se o admin cancelar o modal de travados, os normais permanecem aplicados (já foram salvos), e os travados continuam selecionados para nova tentativa.

**Mudanças em `src/pages/ReportsPage.tsx`**:
1. `handleBulkProgressUpdate`: aplicar `updateOrderStatus` direto nos `normals` antes de abrir o Step 1; toast "X pedido(s) avançaram para Y". Se não houver `regressions`, encerrar via `finalizeBulkUpdate`. Se houver, abrir o Step 1 só com os travados.
2. `handleConfirmRegression`: remover o segundo loop sobre `normalIds` (já foram aplicados) — manter apenas o loop dos `regressionItems` com a justificativa.
3. Step 1 (modal de confirmação): trocar a frase "+ N pedido(s) avançam normalmente" por "✅ N pedido(s) sem trava já foram atualizados" no topo, deixando claro que só falta resolver os travados.
4. Cancelar no Step 1 mantém os travados selecionados (não limpa `selectedIds` deles).

## 2. Espelho de conferência — replicar o layout do `OrderDetailPage`

**Comportamento atual** (`src/pages/OrderPage.tsx`, modal `showMirror`): mostra apenas os campos agrupados por categoria. Não mostra a Composição com preços nem o cabeçalho do pedido.

**Comportamento desejado** (conforme imagem enviada):
O espelho deve ficar **visualmente idêntico** ao `OrderDetailPage`, com duas seções principais:

### Seção 1 — Cabeçalho + Composição do Pedido
Card superior com:
- Linha "Número do Pedido" + número | "Data e Hora" + data/hora atual | "Foto" → "Ver foto" (se houver `fotoUrl`).
- Linha "Prazo X dias úteis" + "X dias úteis restantes" (calculado pelo `orderDeadline.ts` no momento da criação).
- Subtítulo **"Composição do Pedido"**.
- Lista linha-a-linha de cada item de preço (Modelo, Couros, Bordados nominais como "Florência", "Florão Trad", Solado, Cor Sola contextual via `getCorSolaPrecoContextual`, Laser, Glitter, Pintura, Estampa, Metais, Strass/Cruz/Bridão/Cavalo, Tricê, Tiras, Franja, Corrente, Cor Vira, Costura Atrás, Carimbo, Sob Medida, Adicional, Acessórios), com o valor à direita em laranja (`R$ X,XX`).
- Linha **Subtotal**.
- Se houver desconto/acréscimo: linha de ajuste.
- Linha **Total** em destaque (laranja, fonte maior).

### Seção 2 — Detalhes da Bota
Card inferior com cabeçalho "7ESTRIVOS" + Código (numeroPedido) + Vendedor + Data + Tamanho + Modelo + "Foto de Referência" (link), seguido dos blocos `IDENTIFICAÇÃO`, `PESPONTO`, `SOLADOS`, `COUROS`, `BORDADOS` (e demais que tiverem dados), no mesmo estilo do `mirrorGrouped` atual mas com header colorido por categoria igual ao detalhe.

### Implementação
- Reutilizar a lógica de `priceItems` de `OrderDetailPage.tsx` linhas 330-394 (mesmas constantes: `MODELOS`, `COURO_PRECOS`, `BORDADOS_*`, `SOLADO`, `getCorSolaPrecoContextual`, `findFichaPrice`, `getByCategoria`, etc.) — ler do estado local do form em vez de `order.*`.
- `subtotal = sum(priceItems)`, `ajuste = descontoValor || 0`, `total = max(0, subtotal - ajuste)`.
- Botões EDITAR / OK — FINALIZAR no rodapé continuam.
- O modal precisa virar scroll vertical com `max-h-[90vh] overflow-y-auto` (já tem) — o conteúdo cresce.

### Escopo
- **Bota**: `src/pages/OrderPage.tsx` (principal, baseado na imagem).
- **Cinto**: `src/pages/BeltOrderPage.tsx` — aplicar mesmo padrão usando o breakdown de cinto que já existe no detalhe.
- **Extras**: `src/pages/ExtrasPage.tsx` — aplicar mesmo padrão usando `computeExtraTotal`.

## Arquivos afetados
- `src/pages/ReportsPage.tsx` — split scanner em massa
- `src/pages/OrderPage.tsx` — espelho com Composição + Detalhes igual ao detalhe
- `src/pages/BeltOrderPage.tsx` — mesmo espelho para cinto
- `src/pages/ExtrasPage.tsx` — mesmo espelho para extras

## Pendência rápida (sem bloquear)
Os preços no espelho usam o mesmo cascading do detalhe (`ficha_variacoes` → `custom_options` → fallback hardcoded), então não há risco de divergir do que será salvo.
