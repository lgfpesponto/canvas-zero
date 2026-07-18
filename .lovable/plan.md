# Descontos no estoque + Vitrine pública

## 1. Descontos nos produtos de estoque

**Banco (`estoque_produtos`)**
- Adicionar coluna `preco_desconto NUMERIC NULL` (quando preenchida, é o preço "de venda"; `preco` continua sendo o original).
- Como o preço "vivo" acompanha a ficha atual, o desconto é armazenado por SKU e sobrevive a reajustes.

**UI — `EstoqueProdutoConfigButton` (edição do grupo)**
- Nova seção "Descontos":
  - Campo "Aplicar desconto em massa" com dois modos: **% off** ou **R$ fixo** → botão "Aplicar a todos os tamanhos" (calcula e preenche `preco_desconto` de cada linha).
  - Botão "Remover todos os descontos".
  - Por tamanho: input adicional `preco_desconto` ao lado do `preco`, com badge mostrando `% off` calculado.
- Salvar grava `preco_desconto` (ou `NULL` se vazio).

**UI — card na `EstoquePage`**
- Quando `preco_desconto` existir e for menor que `preco`: mostrar preço original riscado + preço com desconto em destaque + badge `-X%`.

## 2. Vitrine pública (link externo)

**Rota nova:** `/vitrine/:token` (pública, sem auth) em `src/pages/VitrinePublicaPage.tsx`.

**Como o link é gerado (na `EstoquePage`):**
- Botão "Compartilhar vitrine" no topo (ao lado dos filtros).
- Abre modal:
  - Resumo: "X produtos com os filtros atuais serão incluídos".
  - Para `admin_master`: toggles **"Mostrar preços"** e **"Mostrar descontos"** (default: ligados).
  - Para `vendedor`, `vendedor_comissao`, `admin_producao`: sem toggles — preços e descontos **sempre ocultos** (força `mostrarPreco=false`).
  - Botão "Gerar link" → codifica os filtros ativos + flags em base64 no token da URL e copia para a área de transferência (também botão WhatsApp).

**Formato do token:** JSON `{ search, tamanhos, ficha, mostrarPreco, mostrarDesconto }` → base64url. Stateless, não precisa de nova tabela.

**Página `/vitrine/:token`:**
- Layout minimalista (similar ao `PublicTrackingPage`): logo 7 Estrivos no topo, sem header do app, sem navegação, sem botões de compra/detalhes.
- Consulta `estoque_produtos` (ativo=true) com o **mesmo agrupamento e filtros** da `EstoquePage` (reaproveita helpers de `fichaFilterKeys`).
- Cards mostram: foto, nome, tamanhos disponíveis (respeitando filtro de numeração, se houver) com quantidade, e — se `mostrarPreco` — preço; se `mostrarDesconto` e houver desconto, mostra original riscado + com desconto.
- Produtos **sem estoque** aparecem em cinza com selo "Indisponível" (mesma regra do portal — atualiza sozinho quando o estoque zera).
- Realtime em `estoque_produtos` para refletir vendas ao vivo (mesma subscription já usada na `EstoquePage`).
- Sem paginação inicial (rolagem contínua); pode adicionar se ficar longo.

**Comportamento dos filtros no link**
- O token carrega o snapshot dos filtros no momento da geração — remover/mudar filtros no portal **não** afeta o link já enviado.
- Produtos que passavam nos filtros mas ficaram sem estoque continuam listados como "Indisponível" (não somem), conforme pedido.

## 3. Detalhes técnicos

- Migração: `ALTER TABLE public.estoque_produtos ADD COLUMN preco_desconto NUMERIC;` (nullable). Sem mudanças de RLS (leitura pública já não existe — a vitrine usará leitura via anon).
- Precisa liberar `GRANT SELECT ON public.estoque_produtos TO anon;` + política RLS `FOR SELECT USING (ativo = true)` para `anon`, senão a vitrine pública não carrega. (Só SELECT; sem insert/update/delete para anon.)
- Reaproveitar `EstoqueFoto`, `buildFichaOptions`, `matchesFichaFilters` e `useFichaFilterKeys` na vitrine.
- Novo componente `src/components/estoque/CompartilharVitrineDialog.tsx` para gerar o link.
- Helper `src/lib/vitrineToken.ts` com `encodeVitrineToken`/`decodeVitrineToken`.

## Fora de escopo (confirmar se quer depois)
- Encurtador de URL / domínio custom para a vitrine.
- Salvar snapshots nomeados de vitrines (ex.: "vitrine Rancho Chique").
