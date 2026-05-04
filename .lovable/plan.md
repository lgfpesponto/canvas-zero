## Mudança

Restringir o avanço a partir dos pespontos numerados no fluxo de **botas** (Faça Seu Pedido):

- `Pesponto 01..05` → só pode avançar para `Pespontando` (não mais direto para `Montagem`).
- `Pesponto Ailton` → continua podendo avançar para `Montagem`.
- `Pespontando` → continua podendo avançar para `Montagem`.
- Resultado: só `Pespontando` e `Pesponto Ailton` chegam direto em `Montagem`.

Retrocessos continuam permitidos (com modal de justificativa) — o `getAllowedNextStatuses` lista todas as etapas do fluxo.

## Cintos

Cintos usam `BELT_STATUSES` simples (`Em aberto / Aguardando / Corte / Bordado / Pesponto / Expedição / ...`) — não têm `Pesponto 01..05` nem `Pespontando`/`Pesponto Ailton`. A regra solicitada não se aplica ao fluxo de cintos; nada a alterar lá.

## Arquivo alterado

### `src/lib/statusTransitions.ts`
Atualizar o `FLOW`:
- `'Pesponto 01': ['Pespontando']`
- `'Pesponto 02': ['Pespontando']`
- `'Pesponto 03': ['Pespontando']`
- `'Pesponto 04': ['Pespontando']`
- `'Pesponto 05': ['Pespontando']`
- `'Pesponto Ailton': ['Montagem']` (mantém)
- `'Pespontando': ['Montagem']` (mantém)

## Resultado

No modal de progresso, ao selecionar um pedido de bota em `Pesponto 03` (por exemplo), o avanço sugerido é `Pespontando`. Para chegar em `Montagem`, é preciso passar antes por `Pespontando` (ou estar em `Pesponto Ailton`). Outras etapas anteriores continuam acessíveis via retrocesso com justificativa.
