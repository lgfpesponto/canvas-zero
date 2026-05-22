# Corrigir bug do desconto duplo + overflow do texto no PDF de Cobrança

## Diagnóstico

**Bug do desconto duplo (pedido 23709 e ~1.140 outros):**
O fallback hardcoded em `src/lib/orderFieldsConfig.ts` ainda tinha o preço antigo da Florência no cano (R$ 25). Quando o lookup do banco (`ficha_variacoes`) falhava por qualquer motivo (cache não carregado, sessão recém-aberta, etc.), o cálculo caía no fallback e devolvia subtotal R$ 365 em vez de R$ 370. Aí o `computeTotalToSave` aplicava o desconto de R$ 5 da migração e gravava preço **R$ 360** (em vez de **R$ 365**). Como o resultado do lookup varia entre sessões, o preço fica oscilando entre R$ 360 e R$ 365.

**Texto fora do quadrado no PDF:**
A justificativa de migração contém `→` (seta) e `—` (travessão). O helvetica do jsPDF não tem essas glyphs e usa substitutos com largura diferente da medida, fazendo a linha estourar a coluna da Composição.

## O que vai mudar

### 1. `src/lib/orderFieldsConfig.ts`
- `BORDADOS_CANO`: Florência R$ 25 → **R$ 30**
- `BORDADOS` (legacy): Florência R$ 25 → **R$ 30**
- Mantém Florência gáspea = R$ 15 e taloneira = R$ 10 (já corretos).

### 2. `src/components/SpecializedReports.tsx` (PDF Cobrança)
- Sanitizar a `justifTextoLimpo` antes de renderizar: trocar `→` por `->`, `–`/`—` por `-`, etc.
- Reduzir a largura de quebra de `cols[2] - 4` para `cols[2] - 6` para garantir margem segura na coluna Composição.

### 3. Migração SQL
Forçar `preco_migrado_v2 = false` nos pedidos com `bordado_cano LIKE '%Florência%'` e `desconto = 5` (status != 'Cancelado') para que o `PrecoAutoBackfill` re-processe cada um com o fallback já corrigido, gravando o preço certo (R$ 365 no caso do 23709).

## Resultado esperado

- Pedido 23709 e demais voltam ao valor correto (R$ 365 etc.) e param de oscilar.
- Justificativa no PDF cabe dentro do quadrado da Composição.
- Modal e PDF voltam a bater exatamente.
