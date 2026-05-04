## Aviso "Faltam pedidos para dar baixa"

Mostrar, em cima do conteúdo do Saldo do Vendedor (admin) e do Meu Saldo (vendedor), um alerta destacando quantos pedidos cobrados ainda estão sem baixa e quanto falta pagar para quitar.

### Cálculo (mesma regra dos dois lados)
Para cada vendedor:
- `pedidosCobrados` = `fetchPedidosCobrados(vendedor)` (já existe em `src/lib/revendedorSaldo.ts`)
- `baixas` = `fetchBaixasVendedor(vendedor)` → set de `order_id` já abatidos
- `pendentes` = pedidos cobrados cujo `id` NÃO está no set de baixas
- `qtdPendente` = `pendentes.length`
- `valorPendenteBruto` = soma de `preco * quantidade` dos pendentes
- `saldoDisponivel` = `vw_revendedor_saldo.saldo_disponivel`
- `valorAQuitar` = `max(0, valorPendenteBruto - saldoDisponivel)`

Aviso só aparece quando `qtdPendente > 0`.

### 1) `src/pages/RevendedorSaldoPage.tsx` (vendedor — Stefany)
A página já calcula `totalPendente` e tem o card "A pagar (pedidos cobrados)". Adicionar, logo abaixo do header (antes do grid de cards), um `Alert` destrutivo quando houver pendência:

```text
[!] Faltam {N} pedido(s) cobrado(s) sem baixa.
    Falta R$ X,XX para quitar.   [Enviar comprovante]
```

Reutilizar o estado já existente: contar `pendentes.length` (hoje só somamos valor — passar a guardar também a contagem em `setQtdPendente`). Botão do alerta abre o mesmo `EnviarComprovanteDialog`.

### 2) `src/components/financeiro/saldo/FinanceiroSaldoRevendedor.tsx` (admin)
Adicionar, abaixo da toolbar de filtros (antes dos cards de resumo), um `Alert` agregado:

- Quando `filterVendedor === 'todos'`: somar pendências de todos vendedores que aparecem em `saldos`. Texto:
  `Faltam {N} pedido(s) cobrado(s) sem baixa em {V} vendedor(es). Total a quitar: R$ X,XX.`
- Quando `filterVendedor !== 'todos'`: mostrar apenas daquele vendedor:
  `{vendedor}: {N} pedido(s) cobrado(s) sem baixa — falta R$ X,XX para quitar.`

Para isso, criar um `useEffect` que carrega, em paralelo, `fetchPedidosCobrados` + `fetchBaixasVendedor` para cada vendedor presente em `saldos` (ou apenas o filtrado). Cachear o resultado em estado `pendenciasPorVendedor: Record<string, { qtd: number; valor: number }>` e recalcular o agregado conforme filtros.

Para evitar muitas chamadas, fazer um único batch `Promise.all` quando `saldos` chega; refazer junto com `load()`.

### 3) Estilo
Usar `<Alert variant="destructive">` de `@/components/ui/alert` com ícone `AlertTriangle` da `lucide-react`. Texto em UTF-8 literal (ç, ã). Não exibir quando não houver pendência.

### Arquivos a alterar
- `src/pages/RevendedorSaldoPage.tsx`
- `src/components/financeiro/saldo/FinanceiroSaldoRevendedor.tsx`

Sem mudanças no banco — toda a informação já existe via `fetchPedidosCobrados` e `fetchBaixasVendedor`.
