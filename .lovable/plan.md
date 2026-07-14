## Objetivo
No modal "Filtros da ficha" (páginas Modelos e Modelos Salvos dentro do "Faça seu Pedido"), agrupar os filtros pelas **categorias da ficha** (Couros, Bordados, Laser e Recortes, Metais, Extras, Solados, etc.), com cada categoria em um bloco **colapsável** (fechado por padrão). Modelo e Gênero ficam **soltos no topo**, sem categoria.

## Regras de exibição
- Buscar `ficha_categorias` (ativas) via join com `ficha_campos`, junto com `categoria_id`, `categoria_nome`, `categoria_ordem`.
- Ordenar categorias por `ficha_categorias.ordem` e campos por `ficha_campos.ordem` dentro de cada categoria.
- **Só renderizar uma categoria** se pelo menos um campo dela tiver valores preenchidos em algum modelo listado (ou seja, `fichaOptions[key].size > 0`).
- **Só renderizar um campo** se tiver ao menos um valor. Continuam valendo as regras atuais (só `selecao`/`multipla`/`checkbox`, checkbox vira chip "Sim", etc.).
- **Modelo e Gênero**: extraídos da categoria "Tamanho / Gênero / Modelo" e mostrados soltos no topo, sem accordion (o campo "Tamanho" continua dentro da sua categoria original — mas como só Modelo/Gênero foram pedidos como topo, Tamanho aparece agrupado normalmente na categoria dele). 
- Categorias iniciam **fechadas**; ao clicar, expandem mostrando os chips dos valores.
- Ao lado do nome da categoria, mostrar badge com nº de filtros ativos dentro dela (se > 0), e auto-expandir categorias que já tenham filtro ativo ao abrir o modal.
- Busca de texto no topo continua funcionando: se houver query, expande automaticamente as categorias que contêm resultados e mostra apenas os campos/valores que casam.

## Alterações técnicas

### `src/lib/fichaFilterKeys.ts`
- Adicionar campos `categoriaSlug`, `categoriaNome`, `categoriaOrdem` em `FichaFilterKey`.
- No `useFichaFilterKeys`, incluir `categoria_id, ficha_categorias(slug,nome,ordem)` no select e preencher os novos campos.
- Dedup por slug mantém o de menor `ordem` (já existe); herda categoria do escolhido.

### `src/components/common/FichaFiltersDialog.tsx`
- Nova prop opcional já existe (`keys`); adicionar renderização em duas partes:
  1. **Topo (sem accordion)**: chips de `modelo` e `genero` (na ordem: Modelo depois Gênero, ou vice-versa conforme `ordem`), apenas se tiverem opções.
  2. **Accordion por categoria** (usar `@/components/ui/accordion` — já presente no shadcn): agrupar demais keys por `categoriaSlug`, ordenar categorias por `categoriaOrdem`, esconder categorias vazias.
- Campos sem categoria (fallback) caem num grupo "Outros" no final.
- Estado de expansão controlado: começa fechado; abre automaticamente categorias com filtros ativos ou com match de busca.
- Contador de ativos por categoria ao lado do título.

### `TemplatesDialog.tsx` e `ModelosPage.tsx`
- Sem mudanças de lógica; só passam `keys={fichaKeys}` como já fazem. A nova estrutura de agrupamento fica encapsulada no `FichaFiltersDialog`.

## Fora do escopo
- Não altera Estoque (usa `FICHA_FILTER_KEYS` estático sem categorias — permanece igual).
- Não muda persistência, snapshots, versão de ficha, nem migrations.
