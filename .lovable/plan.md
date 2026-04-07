

## Corrigir valor de Bota Pronta Entrega na lista e detalhes

### Problema

Para `bota_pronta_entrega`, o `preco` salvo no banco ja e o valor total (soma de todas as botas). Porem, `quantidade` tambem e salvo como o numero de botas (ex: 3). Na lista de pedidos (`OrderCard`), o valor exibido e `preco * quantidade`, o que multiplica incorretamente o total pelo numero de botas (ex: total R$ 900 * 3 = R$ 2700 errado).

Alem disso, nos PDFs dos relatorios especializados, o calculo de `bota_pronta_entrega` usa `det.descricaoProduto` e `det.valorManual` do nivel raiz do extraDetalhes, mas quando ha multiplas botas, esses campos podem nao existir ou representar so a primeira bota.

### Solucao

Salvar `quantidade: 1` para `bota_pronta_entrega` (a info de quantas botas esta dentro de `extraDetalhes.botas`). O campo `preco` continua sendo o valor total. Isso corrige a lista e o header automaticamente.

### Alteracoes

**`src/pages/ExtrasPage.tsx`** (~linha 247)
- Mudar a logica de `quantidade` para `bota_pronta_entrega` de `botasPE.reduce(...)` para `1`
- O preco ja e a soma total, nao precisa multiplicar

**`src/pages/EditExtrasPage.tsx`** (~linha 188)
- Mesmo ajuste: `quantidade` para `bota_pronta_entrega` = `1`

**`src/components/SpecializedReports.tsx`** (~linhas 273 e 1152)
- Atualizar o case `bota_pronta_entrega` para ler `det.botas` (array) e listar cada bota individualmente no PDF, igual ao `OrderDetailPage`
- Se nao tiver array `botas`, fallback para `det.descricaoProduto` / `order.preco`

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/ExtrasPage.tsx` | `quantidade: 1` para bota_pronta_entrega |
| `src/pages/EditExtrasPage.tsx` | `quantidade: 1` para bota_pronta_entrega |
| `src/components/SpecializedReports.tsx` | PDF lista botas individuais do array `det.botas` |

