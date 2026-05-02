## Diagnóstico

Olhei o código do leitor de código de barras dentro de `src/pages/OrderDetailPage.tsx` (botão "Buscar Pedido" no canto superior). Não há erro/crash no console — ele está achando o pedido normalmente (`fetchOrderByScan` funciona). O problema é o mesmo padrão que corrigimos antes nas edições:

**Linha 80 (`handleScanSubmit`):**
```ts
navigate('/pedido/' + match.id);
```

Ele navega para o pedido escaneado **sem** preservar `location.search`. Resultado prático na visão de detalhe:

1. Você está em `/pedido/AAA?status=...&vendedor=...` (com filtros vindos da listagem).
2. Aperta "Buscar Pedido", escaneia o código.
3. App vai para `/pedido/BBB` (sem filtros).
4. O hook `useOrderNeighbors` recarrega **toda** a base, e o pedido escaneado pode nem estar no conjunto filtrado → as setinhas prev/next ficam confusas, "page X de Y" muda, e dá a sensação de que o leitor "não funcionou".

Outro detalhe: na linha 76-78, o código tenta marcar o pedido **atual** (o que você estava vendo antes) como selecionado quando você escaneia outro — provavelmente uma intenção antiga de seleção em massa via scan, mas isso confunde porque seleciona algo que o usuário não pediu para selecionar. Vou checar com você se isso fica ou sai.

## Mudanças propostas

### 1. Preservar filtros no scan (`src/pages/OrderDetailPage.tsx`, linha 80)
```ts
navigate('/pedido/' + match.id + location.search);
```
E adicionar `location.search` ao array de dependências do `useCallback` (linha 88).

### 2. Decisão sobre o auto-select (linhas 76-78)
Hoje, quando você escaneia o pedido B estando no pedido A, o app marca o **A** como selecionado antes de navegar para o B. Possíveis caminhos:
- **(a)** Manter como está (lógica antiga de "ir marcando à medida que confere").
- **(b)** Remover esse auto-select — o scan vira só "ir para o pedido escaneado", sem efeito colateral na seleção.
- **(c)** Inverter: marca o pedido **escaneado** (B) como selecionado, em vez do atual (A).

Preciso da sua escolha aqui — qual é o uso real do scanner nessa tela pra você?

## Arquivo a editar
- `src/pages/OrderDetailPage.tsx` (apenas o handler `handleScanSubmit`)

## Resultado esperado
- Escanear um pedido leva você a ele **mantendo os filtros** que você tinha.
- Setinha prev/next continua respeitando o filtro.
- Comportamento de seleção fica conforme sua resposta na pergunta acima.
