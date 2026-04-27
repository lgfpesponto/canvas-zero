## Objetivo
Tornar **"Bola grande"** 100% equivalente a **"Strass"** dentro da categoria **Metais** (Adicionar Metais): mesmo comportamento de quantidade, mesmo preço (R$ 0,60/un) e mesma exibição em relatórios e detalhes.

## Diagnóstico
O formulário (`ExtrasPage.tsx` / `EditExtrasPage.tsx`) e o cálculo central (`botaExtraHelpers.ts`, `OrderDetailPage.tsx`) **já tratam Bola grande corretamente** com `0.60 × qtdBolaGrande`. A inconsistência está nos **relatórios PDF** e em **labels**:

1. **`src/components/SpecializedReports.tsx`** (2 ocorrências — linhas ~272 e ~1241):
   - Hoje: `priceItems.push(['Bola grande', 15])` — preço fixo errado de R$ 15, ignora quantidade.
   - Strass logo abaixo já faz: `0.60 × qtd`.

2. **`src/components/SpecializedReports.tsx`** (extras embutidos em Bota Pronta Entrega — linhas ~286 e ~1258):
   - Hoje: `parts.push('Bola grande')` — sem mostrar quantidade.
   - Strass faz: `parts.push(\`Strass x${qtdStrass || 1}\`)`.

3. **`src/lib/extrasConfig.ts`** (`EXTRA_DETAIL_LABELS`):
   - Falta `qtdBolaGrande: 'Qtd. de Bola Grande'` (Strass tem `qtdStrass: 'Qtd. de Strass'`).

## Mudanças propostas

### 1. `src/components/SpecializedReports.tsx`
Substituir nas duas ocorrências do bloco `case 'adicionar_metais'`:
```ts
if (sel.includes('Bola grande')) {
  const qtd = parseInt(det.qtdBolaGrande) || 1;
  priceItems.push([`Bola grande (${qtd} un.)`, 0.60 * qtd]);
}
```
E nas duas ocorrências dentro de Bota Pronta Entrega:
```ts
if (ex.dados.metaisSelecionados.includes('Bola grande'))
  parts.push(`Bola grande x${ex.dados.qtdBolaGrande || 1}`);
```

### 2. `src/lib/extrasConfig.ts`
Adicionar em `EXTRA_DETAIL_LABELS`:
```ts
qtdBolaGrande: 'Qtd. de Bola Grande',
```

## O que NÃO muda
- Formulário (`ExtrasPage.tsx`, `EditExtrasPage.tsx`): já tem o input "Qtd. bola grande" idêntico ao Strass.
- `botaExtraHelpers.ts`: já calcula `0.60 × qtdBolaGrande` corretamente.
- `OrderDetailPage.tsx`: já exibe `Bola grande (Nx R$0,60)` corretamente.

## Resultado
Após o ajuste, "Bola grande" e "Strass" terão paridade total: mesmo input de quantidade no formulário, mesmo cálculo (R$ 0,60/un) em todos os lugares, e mesma exibição em PDFs de produção e detalhes de pedido.