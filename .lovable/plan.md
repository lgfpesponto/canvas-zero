# Botão "Gerar etiquetas" também na seleção da lista

O botão foi adicionado apenas dentro do painel do scanner, por isso não aparece quando os pedidos são marcados pelos checkboxes da lista "Meus pedidos" (onde aparecem "Conferir selecionados" e "Criar estoque").

## O que será feito

- Adicionar o botão "Gerar etiquetas (N)" na barra de ações do topo, ao lado de "Criar estoque", usando a seleção da lista.
- Regra de exibição: pedidos selecionados do vendedor "Estoque" com progresso "Baixa Estoque" (mesma base do "Criar estoque", porém sem exigir que o estoque ainda não tenha sido baixado, já que a etiqueta pode ser impressa depois da criação do produto).
- Mesma geração de PDF já implementada (A4, foto | nome + tamanho, 4 colunas x 5 linhas), com spinner enquanto gera.
- O botão do scanner continua existindo, sem duplicar lógica: ambos chamam a mesma função de geração recebendo a lista de pedidos.

## Detalhes técnicos

Em `src/pages/ReportsPage.tsx`, generalizar `handleGerarEtiquetas` para receber a lista de pedidos e renderizar o botão nos dois pontos (toolbar de seleção e painel do scanner), reutilizando `resolveEtiquetaItems` / `gerarEtiquetasPDF` de `src/lib/etiquetasPdf.ts`.
