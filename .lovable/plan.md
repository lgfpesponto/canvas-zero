

## Plano: Corrigir soma de preços das variações e ordenar alfabeticamente

### Problema

Existem dois sistemas paralelos de variações no projeto:
1. **`ficha_variacoes`** — gerenciado no Admin Config (`/admin/configuracoes`)
2. **`custom_options`** — gerenciado inline no formulário de pedido (OrderPage)

O formulário de pedido (OrderPage) usa **apenas** `custom_options` para buscar preços (função `findPrice` linha 595). As variações criadas na ficha admin (`ficha_variacoes`) **não são lidas** pelo formulário, por isso os preços não estão sendo somados.

### Solução

Unificar a leitura: fazer o formulário de pedido ler variações de `ficha_variacoes` (fonte oficial do admin), mantendo `custom_options` como fallback para compatibilidade.

### Implementacao

**1. Criar hook para ler variações de bordado da ficha (`ficha_variacoes`)**

Novo hook ou extensão no `useCustomOptions.ts` que busca variações por slug da categoria (ex: `bordados-cano`, `bordados-gaspea`, `bordados-taloneira`, `laser`, etc.) da tabela `ficha_variacoes` via join com `ficha_categorias`.

**2. Atualizar `OrderPage.tsx` — leitura de variações**

- Na seção `getDbItems` (linha 840), priorizar dados de `ficha_variacoes` sobre `custom_options`
- Na função `findPrice` (linha 595), buscar preço primeiro em `ficha_variacoes`, depois `custom_options`, depois fallback hardcoded
- Ordenar todas as listas de variações **alfabeticamente** antes de renderizar (com "Bordado Variado" agrupado no final)

**3. Ordenar alfabeticamente todos os campos de seleção**

Em `getDbItems` e nos arrays de opções (modelos, couros, cores, bordados, laser, acessórios, etc.), aplicar `.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))` antes de retornar, mantendo itens "Bordado Variado" ao final.

**4. Aplicar a mesma lógica no `EditOrderPage.tsx`**

Garantir que edição de pedidos também leia de `ficha_variacoes` e ordene alfabeticamente.

**5. Script de correção de pedidos passados (migration SQL)**

Criar uma migration que recalcula o preço dos pedidos existentes cujos bordados têm preço diferente do registrado. A migration:
- Busca todos os pedidos de bota (tipo_extra IS NULL)
- Para cada pedido, recalcula o preço total usando os valores atuais das variações em `ficha_variacoes`
- Atualiza apenas pedidos onde o preço calculado difere do atual
- Registra a correção no campo `alteracoes` (histórico de mudanças)

### Arquivos afetados
- `src/hooks/useCustomOptions.ts` ou novo hook — leitura de `ficha_variacoes`
- `src/pages/OrderPage.tsx` — integrar novo hook, ordenação alfabética
- `src/pages/EditOrderPage.tsx` — mesma lógica
- Nova migration SQL — correção de pedidos passados

### Nota importante
A correção dos pedidos passados requer cautela. Antes de aplicar, será feita uma consulta de verificação para identificar quantos pedidos seriam afetados e qual a diferença de valor.

