

## Ajustes nos Graficos do Dashboard

### Constante compartilhada

Criar uma constante para prefixos de exclusao, usada em todos os pontos:

```typescript
const EXCLUDED_PREFIXES = ['TROCA', 'REFAZENDO', 'ERRO', 'INFLUENCER'];
const isExcludedOrder = (numero: string) => EXCLUDED_PREFIXES.some(p => numero.toUpperCase().startsWith(p));
```

### Alteracoes

#### 1. `src/pages/Index.tsx` — "Botas na producao" → "Produtos na producao"

**Admin dashboard (linhas 202-213):**
- Renomear titulo para "Produtos na producao" e texto para "produtos" em vez de "botas"
- Adicionar state `prodProductFilter` (multi-select com checkboxes via Popover) com opcoes: Bota, Regata, Bota P.E., Cinto, e outros extras
- Adicionar state `prodVendedorFilter` (multi-select) — somente no admin
- Filtrar `botasProducao` com base nesses filtros (produto por `tipoExtra` e vendedor)

**Vendedor dashboard (linhas 289-300):**
- Renomear titulo para "Produtos na producao"
- Adicionar filtro de produto (sem filtro de vendedor)
- Mesma logica de filtragem por `tipoExtra`

**Implementacao dos filtros multi-select:**
Usar Popover + Checkbox (mesmo padrao ja usado nos filtros de "Meus Pedidos"). Cada filtro mostra chips com a quantidade selecionada.

#### 2. `src/pages/Index.tsx` — "Quantidade de vendas" exclusao

**No `chartData` useMemo (linha 67):**
- Adicionar filtro `.filter(o => !isExcludedOrder(o.numero))` antes dos filtros de produto/vendedor

Isso se aplica tanto ao admin quanto ao vendedor (ambos usam o mesmo `chartData`).

#### 3. `src/components/CommissionPanel.tsx` — exclusao na comissao

**No `qualifyingOrders` useMemo (linha 50):**
- Adicionar filtro `.filter(o => !isExcludedOrder(o.numero))` para excluir pedidos TROCA/REFAZENDO/ERRO/INFLUENCER da contagem de vendas e comissao

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/Index.tsx` | Renomear card, adicionar filtros multi-select no card de producao, excluir pedidos especiais do grafico de vendas |
| `src/components/CommissionPanel.tsx` | Excluir pedidos especiais da contagem de comissao |

### Resultado

- Card "Produtos na producao" com filtros de produto e vendedor (ADM)
- Grafico de vendas ignora pedidos TROCA/REFAZENDO/ERRO/INFLUENCER
- Comissao do Rancho Chique ignora os mesmos pedidos

