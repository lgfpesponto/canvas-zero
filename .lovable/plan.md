## Confirmação sobre pedidos antigos

**Sim, funciona em pedidos antigos.** Tudo que foi feito é compatível:

- A coluna `desconto` (numeric) e `descontoJustificativa` (text) já existem na tabela `orders` há tempo — qualquer pedido antigo aceita receber valor.
- A coluna `alteracoes` é JSONB e cresce a cada edição. Alterações antigas que não tinham `justificativa` ou `afetouValor` continuam aparecendo no histórico normalmente, só sem a linha "Motivo:" — comportamento esperado.
- A RPC `get_orders_totals` agora aplica o desconto/acréscimo de qualquer pedido (novo ou antigo) automaticamente, pois lê direto do campo `desconto`.
- O PDF de cobrança e a composição buscam a "última justificativa que afetou valor" via `alteracoes[].afetouValor`. Pedidos antigos sem nenhuma alteração desse tipo simplesmente não exibem a linha — assim que o admin editar valor agora, ela passa a aparecer.

## Problemas detectados na revisão

### 1. Card "Edição de Valor" não atualiza a tela sem recarregar

O botão chama `updateOrder(...)` mas **nunca chama `refetchOrder()`**, então a UI fica usando o `order` antigo do hook `useOrderById`. Outras ações da página (ex: linha 665) já fazem `await refetchOrder()`.

### 2. Justificativa duplicada no histórico

O onClick atual monta MANUALMENTE uma entrada em `alteracoes` e passa para o `updateOrder`. Mas o próprio `updateOrder` no `AuthContext` **detecta a mudança em `desconto`** (está em `VALUE_KEYS`) e gera AUTOMATICAMENTE uma alteração com `justificativa` + `afetouValor: true`. Resultado: cada clique vira **2 entradas** no histórico para a mesma ação.

### 3. Linha "Justificativa:" redundante

Logo abaixo de "Total com desconto" tem `{order.descontoJustificativa && <p>Justificativa: ...</p>}` (linhas 833-835). Como agora temos a seção "Última justificativa de alteração de valor" logo abaixo (cobrindo edição normal + edição de valor), a linha vira duplicação visual.

## Mudanças propostas

### `src/pages/OrderDetailPage.tsx`

**A) Tornar o botão `async` + chamar `refetchOrder` ao final:**
```tsx
onClick={async () => {
  // ... validações ...
  await updateOrder(order.id, {
    desconto: novoAjuste,
    descontoJustificativa: justificativaInput.trim(),
  }, `${acaoLabel}: ${formatCurrency(val)} — ${justificativaInput.trim()}`);
  setDescontoInput('');
  setJustificativaInput('');
  await refetchOrder();           // ← faz a tela atualizar na hora
  toast.success(...);
}}
```

**B) Remover a montagem manual de `alteracoes` no payload** — deixar o `updateOrder` detectar a mudança em `desconto` sozinho. Assim cada clique gera UMA entrada no histórico, com `afetouValor: true` e a `justificativa` informada.

**C) Remover as linhas 833-835** (`Justificativa: ...` redundante).

### Sem mudanças no banco

A migration anterior (RPC `get_orders_totals`) já cobre o totalizador para pedidos antigos.

## Resultado esperado

- **Pedidos antigos**: ao aplicar desconto/acréscimo, valor é refletido imediatamente em lista, totalizador, detalhe e PDF de cobrança.
- **Tela atualiza sozinha** após clicar em "Aplicar Desconto/Acréscimo" — sem F5, sem voltar.
- **Histórico limpo**: 1 linha por aplicação, com a justificativa correta.
- **Composição** mostra apenas a "Última justificativa de alteração de valor" (sem duplicar com a linha solta antiga).

Posso aplicar?