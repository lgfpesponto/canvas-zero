## Correção: bolinha invadindo o pedido de baixo no PDF de Cobrança

### Causa
Em `src/components/SpecializedReports.tsx` (~linha 1415):
- `rowH = Math.max(14, lines.length * 3.5 + 6)` → altura mínima da linha = **14mm**.
- A bolinha é desenhada em `cyBall = y + 17` com raio `2.0` → ocupa de `y+15` até `y+19`.
- Quando o pedido tem composição curta (ex.: cinto simples), `rowH` fica em 14mm e a bolinha desenha **fora do quadro**, aparecendo dentro da grade do próximo pedido.

Geometria atual dentro da coluna nº pedido:
- `y+5` → texto número
- `y+6` a `y+13` → código de barras (altura 7mm)
- `y+17` → centro da bolinha (raio 2 → vai até y+19)
- Quadro só vai até `y+14` no caso mínimo → estoura 5mm.

### Correção
Calcular a altura mínima necessária para acomodar a bolinha sempre que houver desconto/acréscimo, e usar esse valor no `Math.max`.

```ts
// Espaço necessário p/ caber bolinha (raio 2) com folga de 2mm:
//   topo do quadro (y) + nº (5) + barcode (8) + bolinha (4) + folga (3) = 20
const minRowH = (o.desconto && o.desconto !== 0) ? 20 : 14;
const rowH = Math.max(minRowH, lines.length * 3.5 + 6);
```

Assim:
- Pedidos sem ajuste: continuam compactos (14mm).
- Pedidos com acréscimo/desconto: linha cresce automaticamente para 20mm, garantindo que a bolinha fique 100% dentro do quadro daquele pedido.
- Composições longas (que já passam de 20mm via `lines.length * 3.5 + 6`) seguem inalteradas.

A posição da bolinha (`cyBall = y + 17`, raio `2.0`) **não muda** — apenas a grade cresce para abraçá-la.

### Arquivo
- `src/components/SpecializedReports.tsx` (linha ~1415)

### Observação (não incluída nesta correção)
Você mencionou também o "Cinto R$ 0" aparecendo. Isso vem da linha 248 (`priceItems.push(['Cinto', 0])`), que adiciona um label fixo "Cinto" com preço zero como cabeçalho da composição. Se quiser que eu remova/oculte essa linha quando o valor for 0, me avise em uma próxima rodada — quis manter o escopo desta correção apenas no posicionamento da bolinha, conforme pedido.
