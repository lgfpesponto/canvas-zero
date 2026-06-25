# Phase 4 — Auto-preenchimento inteligente do Nome do produto e SKU (vendedor=Estoque)

## Objetivo
Reduzir digitação no cadastro de pedidos de Estoque: nome do produto puxa do modelo, SKU sugerido vem do nome do produto, e se o nome bater com um produto já existente no estoque, traz o SKU dele — tudo editável.

## 1. Nome do produto a partir do modelo (OrderPage)

Já existe em `src/pages/OrderPage.tsx` (`handleModeloChange`):
- Quando `vendedorSelecionado === 'Estoque'` e `nomeProdutoEstoque` está vazio, preenche com o `modelo` escolhido.

Ajustes:
- **Mantém editável** (já é — campo livre). Sem mudança extra.
- Aplicar a mesma regra ao montar o estado inicial quando o pedido começa já com modelo (template / draft / `templateInit`): se vendedor=Estoque e nome vazio mas modelo preenchido → seta o nome.

## 2. SKU sugerido a partir do nome do produto (GradeEstoque)

Hoje `suggestSkuBase` em `OrderPage.tsx` (linha ~1789) usa `slug(modelo)`. Trocar para:
- **Base**: `slug(nomeProdutoEstoque)` quando preenchido; cai para `slug(modelo)` se nome vazio.
- A geração por tamanho continua sendo `${base}-${tamanho}` dentro do `GradeEstoque` (já funciona).
- Cada linha continua editável (já é).

## 3. Reusar SKU de produto já existente no estoque (lookup por nome)

Quando o usuário abre a Grade de Estoque com `vendedor=Estoque`:

1. `OrderPage` faz uma consulta única antes de abrir o dialog (ou ao montar o dialog):
   ```sql
   SELECT sku_base, nome FROM estoque_produtos
   WHERE lower(unaccent(nome)) = lower(unaccent(:nomeProdutoEstoque))
     AND ativo = true
   LIMIT 1
   ```
   (cliente faz a normalização — `nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()` — e usa `.ilike` para o filtro server-side; depois filtra exato no cliente.)
2. Se encontrar:
   - Usa `stripSizeSuffix(sku_base)` como `suggestSkuBase` (remove eventual `-38` final, caso o registro existente já tenha sufixo de tamanho).
   - Mostra aviso curto no topo do dialog: "Encontramos o produto **'X'** no estoque — SKU sugerido `bota-...` (editável)".
3. Se não encontrar: usa a regra do item 2 (slug do nome → slug do modelo).
4. Cada SKU por linha continua **editável** como já é, e a validação de colisão existente em `GradeEstoque` (`skuConflicts`) continua avisando sem bloquear.

## 4. Detalhes técnicos

**Arquivos alterados**
- `src/pages/OrderPage.tsx`
  - Ajustar fonte do `suggestSkuBase` para usar `nomeProdutoEstoque`.
  - Adicionar `useEffect` (ou async ao abrir o botão "Grade") que consulta `estoque_produtos` por nome e guarda `suggestedSkuFromExisting` em state, passado ao `GradeEstoque`.
  - Garantir preenchimento de `nomeProdutoEstoque` quando o estado inicial vem com modelo (template/draft).
- `src/components/GradeEstoque.tsx`
  - Aceitar nova prop opcional `matchedExistingSku?: { sku: string; nome: string }` para renderizar a faixa de aviso "produto já existe". Comportamento padrão (sugestão) reaproveita `suggestSkuBase`.

**Sem mudanças**
- Sem migração de banco; usa `estoque_produtos` já existente com RLS atual (admin/vendedor podem ler).
- `BeltOrderPage` fica de fora (cintos não usam fluxo de estoque).

## 5. Fora do escopo
- Auto-completar nome do produto enquanto digita (autocomplete) — apenas lookup por igualdade após o nome estar preenchido.
- Mudanças em `EstoqueAdminPanel` (edição depois da criação) — já tem campos livres e segue como está.

Confirma para implementar?
