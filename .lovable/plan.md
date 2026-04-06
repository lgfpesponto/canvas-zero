

## Quadros de Pedidos com Solados Específicos (Dashboard ADM)

### Resumo

Criar 3 quadros no dashboard admin (ambos: Juliana e Fernanda) que filtram automaticamente pedidos de bota por tipo de solado e cor da vira, com funcionalidades de "feito" (dismiss), filtro por progresso, seleção múltipla e geração de relatório PDF.

### Abordagem

Criar um componente reutilizavel `SoladoBoard` que recebe um titulo, uma função de filtro, e a lista de pedidos. Os 3 quadros usam o mesmo componente com filtros diferentes.

O estado de "feito" (dismiss) sera salvo em `localStorage` por quadro, para persistir entre sessoes sem alterar o banco.

### Componente: `src/components/SoladoBoard.tsx`

Componente reutilizavel que recebe:
- `title: string` — titulo do quadro
- `orders: Order[]` — pedidos ja filtrados
- `storageKey: string` — chave localStorage para dismissed IDs

Funcionalidades internas:
- **Estado dismissed:** `Set<string>` de IDs, salvo em localStorage
- **Filtro de progresso:** Popover com checkboxes multi-select dos status de producao (usando `PRODUCTION_STATUSES` do AuthContext)
- **Selecao multipla:** Checkboxes em cada pedido + botao "Marcar feito" em lote
- **Botao "Feito"** em cada pedido individual
- **Botao "Gerar relatorio"** no topo — gera PDF simples com jsPDF listando os pedidos visiveis

Cada pedido exibe:
- Numero do pedido
- Vendedor
- Descricao do solado: `tamanho | genero | solado | formato bico | cor sola | cor vira | forma`
- Data do pedido (`dataCriacao`)
- Progresso atual (`status`)
- Prazo restante (`diasRestantes` — ex: "5d uteis" ou "✓")

### Integração no Dashboard: `src/pages/Index.tsx`

No `renderAdminDashboard`, apos a seção de relatórios especializados e antes do card de armazenamento, adicionar os 3 quadros:

```typescript
// Filtros
const solaCouroOrders = allOrders.filter(o =>
  !o.tipoExtra &&
  ['Couro Reta', 'Couro Carrapeta', 'Couro Carrapeta com Espaço Espora']
    .some(s => o.solado.toLowerCase() === s.toLowerCase())
);

const solaRusticaOrders = allOrders.filter(o =>
  !o.tipoExtra && o.solado.toLowerCase() === 'rústica'
);

const viraColoridaOrders = allOrders.filter(o =>
  !o.tipoExtra &&
  ['rosa', 'preta'].some(c => o.corVira.toLowerCase() === c.toLowerCase())
);
```

Renderizar 3 instancias de `<SoladoBoard>`.

Tambem adicionar no `renderFernandaDashboard` para que Fernanda veja os quadros.

### Arquivos

| Arquivo | O que muda |
|---------|-----------|
| `src/components/SoladoBoard.tsx` | Novo componente reutilizavel |
| `src/pages/Index.tsx` | Filtrar pedidos e renderizar 3 quadros no dashboard admin e Fernanda |

