
## 1. Título da vitrine automático

- Remover input "Título" e botão "Enviar no WhatsApp" de `CompartilharVitrineDialog`.
- Título = `profile.nomeLoja` do usuário logado; fallback `"Vitrine 7ESTRIVOS"`. Enviado no token automaticamente.
- Em `VitrinePublicaPage`: setar `document.title` e injetar `<meta og:title>`, `<meta twitter:title>`, `<meta og:description>` via efeito.

## 2. Descontos por produto (não por tamanho)

### Banco (migração)
- `estoque_descontos`: `nome`, `tipo` ('pct'|'fixo'), `valor`, `escopo` ('todos'|'produtos'), `ativo`, `criado_por`, timestamps.
- `estoque_desconto_produtos` (M:N): `desconto_id`, `produto_grupo_key text`.
- GRANTs: SELECT `authenticated`+`anon`; INSERT/UPDATE/DELETE só `admin_master`.
- `orders.desconto_aplicado jsonb` (snapshot congelado).
- `estoque_produtos.preco_desconto` deixa de ser usado (mantida por compatibilidade).

### Helpers
- `src/lib/estoqueGroupKey.ts`: chave `${nome}||${sku_base.split('-').slice(0,-1).join('-')}`.
- `src/lib/estoqueDescontos.ts`: `useDescontosAtivos()` e `getDescontoParaProduto(grupoKey, precoBase)` → escolhe o desconto de maior abatimento (não soma).

### UI Estoque (`EstoquePage`)
- Botão **"Adicionar desconto"** acima de "Compartilhar vitrine", só `admin_master`.
- `GerenciarDescontosDialog`: nome, tipo (%/R$), valor, escopo ("Todos os produtos" ou "Selecionar produtos" com busca + checkboxes). Chips de descontos ativos com botão excluir (soft delete).
- Cards: preço original riscado + preço final destacado + badge `-{X}% de desconto` / `-R$ Y de desconto` + nome do desconto.
- Remover seção "Desconto em massa" e coluna "Desconto" do `EstoqueProdutoConfigButton`.

### Vitrine pública
- Reusa `useDescontosAtivos` (RLS anon). Mesma exibição quando `mostrarPreco && mostrarDesconto`.

### Compra / composição
- Compra aplica desconto: `orders.preco` = valor com desconto; `orders.desconto_aplicado = { nome, tipo, valor, valor_original, valor_desconto }`.
- `OrderDetailPage`/`priceItems`/espelho/PDFs: nova linha `"Desconto {valor} + {nome}"` como item negativo.

## 3. Filtro por tamanho oculta produtos zerados nesse tamanho

- Regra: quando o filtro de numeração está ativo, um produto só aparece se **pelo menos um tamanho filtrado tem `quantidade > 0`**. Tamanhos filtrados com 0 continuam ocultos do card (comportamento atual).
- Sem filtro de tamanho: mantém comportamento atual (mostra produto se qualquer tamanho tiver estoque).
- Aplicar em:
  - `EstoquePage`: no agrupamento/filtragem antes do render dos cards.
  - `VitrinePublicaPage`: mesma regra usando os tamanhos do token.
- Remover/ajustar o banner "INDISPONÍVEL" que hoje aparece na vitrine para tamanhos filtrados: como o produto some, não é mais necessário nesse caso.

## 4. Restrições de papel
- `admin_producao`: sem preços, sem "Adicionar desconto", sem toggles no compartilhar.
- `admin_master`: único que gerencia descontos.

## Ordem de implementação
1. Migração SQL (tabelas de desconto + `orders.desconto_aplicado` + policies/grants).
2. Helpers `estoqueGroupKey.ts` e `estoqueDescontos.ts`.
3. `GerenciarDescontosDialog` + botão em `EstoquePage`.
4. Renderização preço/desconto nos cards (Estoque + Vitrine).
5. Filtro que oculta produtos zerados no tamanho filtrado (Estoque + Vitrine).
6. Aplicação real do desconto na compra + exibição na composição do pedido.
7. Remover UI de desconto por tamanho no `EstoqueProdutoConfigButton`.
8. Título automático + remoção do botão WhatsApp em `CompartilharVitrineDialog` + meta tags em `VitrinePublicaPage`.
