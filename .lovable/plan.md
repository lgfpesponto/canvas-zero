# Plano

## O que vou ajustar

1. Corrigir a tela de Relatórios para que, com o filtro `Apenas atrasados` ativo, todos os números e listas exibidos venham da mesma fonte de dados filtrada, sem manter valores herdados da consulta paginada normal.
2. Remover o bloco `Pedidos apagados` do dashboard do `admin_master`.
3. Transformar `Pedidos em Alerta` em um painel minimizado por padrão, no mesmo padrão visual/comportamental dos quadros de solas.

## Como será feito

### 1) Unificar o modo `Apenas atrasados` em `ReportsPage`
- Criar uma camada única de dados exibidos no modo atrasados, derivada de `overdueOrders`, para evitar que alguns números continuem usando `serverOrders`/`serverCount`/RPC normal.
- Ajustar os resumos exibidos para sempre refletirem exatamente a lista visível quando `Apenas atrasados` estiver ativo.
- Revisar também contagens auxiliares e estados de loading da tela para garantir que a UI não mostre valores antigos enquanto a busca dos atrasados ainda está recarregando.
- Preservar a lógica atual de filtros combinados, incluindo produto, vendedor, clientes virtuais da Juliana, busca textual e filtro por status alterado.

### 2) Remover `Pedidos apagados` do dashboard
- Excluir a renderização do card `Pedidos apagados` do `AdminDashboard`.
- Remover estados, efeitos, imports e handlers que existem apenas para esse bloco, para não deixar código morto.
- Manter intacta a lógica de armazenamento/limpeza geral que ainda for usada em outras áreas.

### 3) Deixar `Pedidos em Alerta` recolhível igual aos quadros de solas
- Aplicar ao painel de alertas o mesmo padrão dos `SoladoBoard`:
  - inicializar minimizado;
  - exibir cabeçalho com contador;
  - botão de expandir/minimizar;
  - conteúdo listado só quando expandido.
- Manter a regra atual de alertas: mostrar apenas pedidos atrasados e fora de etapa final no status atual.
- Preservar o botão `Conferido` e o armazenamento local dos itens já marcados.

## Resultado esperado
- Ao ativar `Apenas atrasados`, a tela passa a atualizar corretamente os números exibidos junto com a lista filtrada.
- O dashboard do `admin_master` fica mais limpo, sem `Pedidos apagados`.
- `Pedidos em Alerta` passa a abrir recolhido, no mesmo estilo dos quadros de solas.

## Detalhes técnicos
- Arquivos principais:
  - `src/pages/ReportsPage.tsx`
  - `src/components/dashboard/AdminDashboard.tsx`
- Não pretendo alterar regra de negócio de prazo; só alinhar a camada de exibição e o comportamento visual.
- Se necessário, extraio pequenos cálculos locais (`displayCount`, `displayLoading`, `displayOrders`) para evitar novas divergências entre modo normal e modo atrasados.