

## Botão "Visualizar Pedidos" no Painel de Scanner

### Resumo

Adicionar um botão "Visualizar pedidos" no painel grande de leitura de código de barras. Ao clicar, exibe uma lista scrollável com todos os pedidos selecionados (número e status).

### Alteração: `src/pages/ReportsPage.tsx`

#### 1. Novo estado

```typescript
const [showSelectedList, setShowSelectedList] = useState(false);
```

Reset ao limpar seleção (junto com `setLastScannedNumero(null)`).

#### 2. Botão "Visualizar pedidos" no painel (entre o contador e o input de scanner, ~linha 265)

Adicionar botão com ícone `Eye`:
```typescript
<button onClick={() => setShowSelectedList(v => !v)} className="text-sm text-green-300 underline">
  {showSelectedList ? 'Ocultar pedidos' : 'Visualizar pedidos'}
</button>
```

#### 3. Lista de pedidos selecionados (condicional, abaixo do botão)

Quando `showSelectedList` é `true`, renderizar lista scrollável:
- Filtrar `filteredOrders` por `selectedIds`
- Mostrar número do pedido e status de cada um
- Container com `max-h-48 overflow-y-auto` e estilo consistente com o painel escuro
- Cada item: `bg-gray-800 rounded px-3 py-2` com número em destaque

```typescript
{showSelectedList && (
  <div className="mb-4 max-h-48 overflow-y-auto space-y-1 bg-gray-800 rounded-lg p-3">
    {filteredOrders.filter(o => selectedIds.has(o.id)).map(o => (
      <div key={o.id} className="flex justify-between text-sm py-1 border-b border-gray-700 last:border-0">
        <span className="font-bold text-green-300">{o.numero}</span>
        <span className="text-gray-400">{o.status}</span>
      </div>
    ))}
  </div>
)}
```

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/ReportsPage.tsx` | Estado `showSelectedList`, botão toggle, lista scrollável de pedidos selecionados no painel do scanner |

