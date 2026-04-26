
## Objetivo

Garantir que **todo Modelo e Bordado cadastrado tenha preço > 0**, bloquear no admin e no formulário qualquer brecha que cause "furo" no relatório, e fazer o breakdown dos PDFs ler os preços reais do banco (não mais constantes hardcoded).

A regra **só se aplica a Modelo e Bordado**. Outras categorias (couro, solado, cor de linha, etc.) continuam podendo ter preço R$ 0 — é legítimo.

---

## Parte 1 — Validação no admin (cadastro de variações)

### Categorias que exigem preço > 0
Identificadas pelo `slug` da categoria:
- **Modelo**: `modelos`, `tamanho-genero-modelo`
- **Bordado**: `bordados-cano`, `bordados-gaspea`, `bordados-taloneira`, `bordados-visual`

### Regra de "Sem bordado"
Você escolheu opção **(a)**: variações cujo nome seja exatamente `"Sem bordado"` (case-insensitive) ficam isentas e podem ter preço R$ 0. Qualquer outra variação dessas categorias precisa de preço > 0.

### Onde implementar

**`src/pages/AdminConfigVariacoesPage.tsx`**
- Receber `slug` da categoria (já vem da URL) e descobrir se é categoria "obrigatória de preço".
- Função utilitária local `requiresPrice(categoriaSlug, nomeVariacao)` retorna `true` quando precisa validar.
- **Inline edit** (`handleInlineUpdate`): se o campo for `preco_adicional`, validar antes de chamar mutation. Se inválido → `toast.error("Modelos e Bordados precisam ter preço > 0 para evitar furo nos relatórios")` e cancelar.
- **Bulk import** (`handleBulkConfirm`): validar cada item; se algum bordado/modelo vier sem preço, mostrar lista de inválidos e bloquear o insert inteiro.
- **Indicador visual**: badge vermelho `⚠ sem preço` na linha de variações legadas (Modelo/Bordado com `preco_adicional = 0` e nome ≠ "Sem bordado"). Banner no topo da página com contador "X variações precisam de preço".

**`src/components/admin/FichaBuilder.tsx`**
- Ao criar campo personalizado novo, se o nome do campo bate com "modelo" ou "bordado*", validar `opcoesRaw`: cada linha precisa ter preço > 0 (exceto "Sem bordado").

**`src/hooks/useCustomOptions.ts`**
- `addOption` e `updateOption`: bloquear se `categoria` for de bordado e `preco <= 0` (e nome ≠ "Sem bordado").

---

## Parte 2 — Validação no formulário de pedido

**Arquivos**: `src/pages/DynamicOrderPage.tsx`, `src/pages/OrderPage.tsx`, `src/pages/EditOrderPage.tsx`

- Adicionar validação no submit: campo **Modelo é obrigatório** sempre. Sem modelo → bloquear com toast `"Selecione o modelo da bota antes de continuar"`.
- Para bordados: já são selecionados (sempre tem opção "Sem bordado"). Garantir que o submit não passe sem que o vendedor tenha escolhido alguma das opções (mesmo que seja "Sem bordado").
- A validação já existe parcialmente para `obrigatorio: true` nos `ficha_campos` — vamos reforçar para Modelo independente da flag.

---

## Parte 3 — Breakdown do PDF lendo do banco

**Problema atual**: `SpecializedReports.tsx` e `pdfGenerators.ts` usam constantes hardcoded (`MODELOS`, `BORDADOS_CANO`, etc.) para descobrir o preço de cada componente. Variações cadastradas via admin caem em `R$ 0` na linha do breakdown (mas o total geral está correto, pois usa `order.preco`).

### Solução: utilitário `priceLookup`

**Novo arquivo**: `src/lib/priceLookup.ts`
```ts
type PriceMap = Record<string, Record<string, number>>; // categoriaSlug -> nomeNormalizado -> preço

export async function loadPriceLookup(): Promise<PriceMap> {
  // 1. SELECT em ficha_variacoes JOIN ficha_categorias (slug, nome, preco_adicional)
  // 2. SELECT em custom_options (categoria, label, preco)
  // 3. Mesclar em PriceMap (variacoes têm prioridade, custom_options preenche o resto)
}

export function getPrice(map: PriceMap, categoria: string, nome?: string): number {
  if (!nome) return 0;
  return map[categoria]?.[nome.toLowerCase().trim()] ?? 0;
}
```

### Refatoração nos relatórios

**`src/components/SpecializedReports.tsx`**
- Antes de gerar qualquer PDF que use `computePriceItems`, chamar `loadPriceLookup()` uma vez e passar o mapa para a função.
- Substituir `MODELOS.find(...)?.preco` por `getPrice(map, 'modelos', o.modelo)`.
- Substituir cada `BORDADOS_CANO.find(...)?.preco` por `getPrice(map, 'bordados-cano', o.bordadoCano)` (idem gáspea/taloneira).
- Linha de Modelo passa a **sempre ser impressa quando `o.modelo` existe**, com o preço real do banco.

**`src/lib/pdfGenerators.ts`**
- Mesma estratégia onde houver breakdown.

### Fallback
Se o banco não retornar preço (variação legada sem cadastro), continua usando a constante hardcoded como último recurso — assim relatórios antigos não quebram.

---

## Parte 4 — Migração de dados (correção das legadas)

Não vou apagar nada. Vou apenas listar o que precisa de atenção via UI:
- Hoje os dados mostram **0 modelos sem preço** ✅ e **2 bordados sem preço** (1 em Cano, 1 em Gáspea — provavelmente "Sem bordado", que é caso permitido).
- O banner visual no admin vai destacar isso para você revisar manualmente. Nada será modificado automaticamente, conforme regra de preservação de dados.

---

## Arquivos a editar

- `src/pages/AdminConfigVariacoesPage.tsx` — validação inline + bulk + indicador visual
- `src/components/admin/FichaBuilder.tsx` — validação ao criar ficha
- `src/hooks/useCustomOptions.ts` — guarda em `addOption`/`updateOption`
- `src/pages/DynamicOrderPage.tsx` + `OrderPage.tsx` + `EditOrderPage.tsx` — Modelo obrigatório no submit
- `src/lib/priceLookup.ts` — **novo**, mapa unificado de preços
- `src/components/SpecializedReports.tsx` — breakdown lê do banco
- `src/lib/pdfGenerators.ts` — breakdown lê do banco

## Memória a salvar

`mem://features/admin/required-price-categories.md` — regra: Modelo e Bordado obrigam preço > 0 (exceto "Sem bordado"); demais categorias podem ter R$ 0.

`mem://features/reports/dynamic-price-breakdown.md` — relatórios consultam preços reais via `priceLookup` em vez de constantes; modelo sempre aparece quando preenchido.
