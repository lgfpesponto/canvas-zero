# Corrigir edição de cinto para refletir a ficha de cinto (não a de bota)

## Diagnóstico

Encontrei o bug exato. Existem **dois pontos** no app que abrem a tela de edição de um pedido:

| Local | Roteamento atual | Status |
|---|---|---|
| `src/components/OrderCard.tsx` (lista de pedidos) | cinto → `/editar-cinto` ✅ | Correto |
| `src/pages/OrderDetailPage.tsx` linha 380 (botão lápis na página de detalhes) | cinto → `/editar` ❌ | **Bug** |

No `OrderDetailPage.tsx` a condição está invertida:

```ts
const base = order.tipoExtra && order.tipoExtra !== 'cinto'
  ? `/pedido/${order.id}/editar-extra`
  : `/pedido/${order.id}/editar';   // ← cinto cai aqui e abre EditOrderPage (ficha de BOTA)
```

Resultado: quando o admin abre o pedido de cinto e clica no lápis, é levado para a **ficha de bota** (`EditOrderPage`), com campos de modelo/solado/cano/gáspea/taloneira — em vez da `EditBeltPage` que tem os descritivos reais (Tamanho, Tipo de Couro, Cor, Fivela, Bordado P, Nome Bordado, Carimbo).

A `BeltOrderPage` (criação) e a `EditBeltPage` (edição) já estão **espelhadas e idênticas** em campos. O problema é só de roteamento.

## Mudança proposta

**Arquivo único:** `src/pages/OrderDetailPage.tsx` (linha 380)

Substituir a lógica binária por uma cascata de 3 vias, igual à do `OrderCard.tsx`:

```ts
const base = order.tipoExtra === 'cinto'
  ? `/pedido/${order.id}/editar-cinto`
  : order.tipoExtra
    ? `/pedido/${order.id}/editar-extra`
    : `/pedido/${order.id}/editar`;
```

## Resultado esperado

Ao clicar no lápis de edição na página de detalhes de um pedido de cinto, o admin será levado para `EditBeltPage`, que mostra exatamente os mesmos campos do formulário de criação de cinto (Tamanho, Couro, Fivela, Bordado P, Nome Bordado, Carimbo a Fogo, Adicional, Observação) — refletindo os descritivos reais da ficha de cinto.

## Fora de escopo

- **Não** vou criar um campo "Modelo" novo para cinto (entendi que você quis dizer "modelo da ficha" = layout do formulário, não um novo campo). Se você quiser um campo "Modelo" cadastrável via admin (como em bota), me avisa que faço como tarefa separada.
- Nenhuma alteração de banco de dados, regras de preço, ou de outras telas.
