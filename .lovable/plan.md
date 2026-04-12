

## Plano: Espelhar ficha bota com formato MultiSelect e edição em massa

### Problema
O editor admin da bota mostra categorias como collapsibles genericos com `VariacaoRow`. O usuario quer que seja **exatamente igual** ao formulario do OrderPage -- com o formato de grid de checkboxes/badges igual ao `MultiSelect` dos bordados -- mas em **modo edição** em toda a ficha. A reordenacao e para mover **campos/secoes** (nao variacoes, que sao sempre alfabeticas). Precisa de edicao em massa para acrescentar valor X em todas as variacoes.

### O que muda

**1. Formato visual de cada categoria: usar o formato MultiSelect do OrderPage**
- Grid de checkboxes com nome + preco, igual ao bordado no "faca seu pedido"
- Botao lapis (Pencil) abre modo edicao inline: cada item vira input editavel (nome + preco + delete)
- Botao "Ed. massa" para adicionar valor X a todas as variacoes de uma categoria
- Botao "+" para adicionar nova variacao (com campos: nome, preco, tipo, obrigatorio, relacionamento)
- Busca/pesquisa quando ha muitos itens
- Variacoes sempre ordenadas **alfabeticamente** (nao por `ordem`)

**2. Reordenacao de campos/secoes (nao variacoes)**
- Setas up/down nos titulos de secao para mover secoes inteiras
- Isso reordena as categorias na tabela `ficha_categorias` (coluna `ordem`)

**3. Botoes no topo**
- **"+ Campo"**: adicionar nova categoria com tipo, obrigatorio, relacionamento
- **"Salvar"**: batch update de ordens das categorias

**4. Layout espelhado do OrderPage**
- Mesmas secoes: Couros (grid 2 colunas tipo+cor), Bordados (3 sub-secoes), Laser (3 sub-secoes), Pesponto (grid 3 colunas), Metais (grid 3 colunas), Solados (grid 4 colunas), etc.
- Cada select/multi-select do OrderPage vira o componente admin com as opcoes editaveis

### Componente reutilizavel: `AdminMultiSelect`

Baseado no `MultiSelect` do OrderPage, mas sem o checkbox de selecao (nao estamos fazendo pedido). Mostra:
- Lista de variacoes em grid (nome + preco) -- sempre alfabetica
- Botao lapis: entra em modo edicao (inputs editaveis por item + delete)
- Botao "Ed. massa": input para somar valor X a todos os precos
- Botao "+": dialog para nova variacao (nome, preco, tipo, obrigatorio, relacionamento)
- Botao link: editar relacionamentos da variacao

### Arquivo afetado
- `src/pages/AdminConfigFichaPage.tsx` -- reescrever secao boot para usar `AdminMultiSelect` no formato do OrderPage, com reordenacao de secoes e edicao em massa

### O que NAO muda
- `OrderPage.tsx` -- intocado
- Pedidos existentes
- Fichas dinamicas -- mantem layout atual
- Hooks/mutations -- ja existem todos

