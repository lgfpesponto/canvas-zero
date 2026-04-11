

## Plano: Minimizar Quadros de Solado no Dashboard

### O que muda

Os 3 quadros de solado (Sola de Couro, Sola Rustica, Vira Colorida) no dashboard admin passam a iniciar **colapsados**, mostrando apenas:
- Nome do quadro (titulo)
- Badge com quantidade de pedidos
- Botao "Gerar relatorio" (PDF)
- Botao "Expandir" para abrir o conteudo completo

### Implementacao

**Arquivo unico**: `src/components/SoladoBoard.tsx`

1. Adicionar estado `collapsed` iniciando como `true`
2. Quando `collapsed === true`, renderizar apenas uma barra compacta com:
   - Titulo + badge `({visibleOrders.length} pedidos)`
   - Botao "Gerar relatorio" (mantém o `exportPDF` existente)
   - Botao "Expandir" com icone `ChevronDown` que seta `collapsed = false`
3. Quando `collapsed === false`, renderizar o conteudo completo atual + botao "Minimizar" com `ChevronUp`
4. O Dialog de tela cheia (Maximize2) continua funcionando independente do estado collapsed

Nenhuma alteracao necessaria em `AdminDashboard.tsx` ou `FernandaDashboard.tsx` -- a mudanca e interna ao componente.

