# Por que o ajuste retroativo "não rodou" para Maria Gabriela

## Diagnóstico

Investiguei o banco e o código. Encontrei dois fatos que, juntos, explicam tudo:

**1. Nenhuma mudança de preço foi efetivamente confirmada no diálogo.**
- A tabela `preco_mudancas` está **vazia** — nunca um registro foi criado.
- Os logs do Postgres não mostram nenhuma chamada à RPC `aplicar_mudanca_preco`.
- Conclusão: ou você clicou em **Cancelar** no diálogo "Mudança de preço detectada", ou o valor que você digitou era igual ao anterior (o guard pula nesse caso). O preço da variação na `ficha_variacoes` pode ter sido alterado por outro caminho, mas a RPC retroativa nunca foi disparada.

**2. Mesmo se você tivesse confirmado, o total da Maria Gabriela NÃO diminuiria.**

Este é o ponto importante — é uma **diferença entre o que a ferramenta faz e o que você espera**.

Lendo a função `aplicar_mudanca_preco` no banco e o texto do diálogo (`src/components/admin/PriceChangeDialog.tsx`), a regra atual em **"Desde o início do portal"** é, literalmente:

> "Todos os pedidos anteriores ficam **congelados no preço atual**. Só pedidos novos a partir de agora usam o preço novo."

Ou seja, a função:
- Marca `preco_congelado = true` em todos os pedidos antigos.
- Grava `extra_detalhes.ajustes_retroativos` (informativo).
- Atualiza o preço da variação para o novo valor.
- **NÃO mexe em `orders.preco`** dos pedidos antigos.

Resultado: os 1.016 pedidos da Maria Gabriela continuam com o `preco` que tinham na hora em que foram criados. O relatório, que soma `orders.preco`, naturalmente mantém R$ 354.290,20.

A queda de R$ 354.376,80 (snapshot 19/05) → R$ 354.290,20 (hoje) é só efeito de pedidos editados, cancelados ou trocados manualmente nesse intervalo.

## O que você provavelmente queria

"Quero baixar o preço da variação X e que os pedidos antigos da Maria Gabriela passem a valer menos" — isso a ferramenta atual **não faz**. Hoje ela faz o oposto: protege os antigos contra mudança e só aplica para frente.

## Proposta

Adicionar um modo "aplicar para trás de verdade" no diálogo, que recalcula `orders.preco` nos pedidos elegíveis em vez de só congelar.

### Mudanças

**1. Banco — atualizar `aplicar_mudanca_preco`**

Adicionar parâmetro `_modo` com dois valores:
- `'congelar'` (padrão atual) — mantém o comportamento de hoje.
- `'recalcular'` (novo) — para cada pedido elegível, faz `preco = preco + (delta × quantidade)`, registra no `historico` e em `extra_detalhes.ajustes_retroativos`, e marca `preco_congelado = true` no valor NOVO.

Observação técnica: o cálculo `delta × quantidade` é uma aproximação simples — assume que a variação aparece uma vez por unidade do pedido. É a mesma aproximação que a função já usa em `v_valor_delta`. Para pedidos `bota_pronta_entrega` com múltiplas botas, multiplica pela quantidade de botas no `extra_detalhes`.

**2. Frontend — `src/components/admin/PriceChangeDialog.tsx`**

Adicionar um seletor "O que fazer com pedidos antigos?" com duas opções claras:
- **Manter como estão** (congela no preço atual) — texto e comportamento de hoje.
- **Recalcular para o preço novo** (atualiza `orders.preco`) — texto explicando que o valor dos pedidos antigos vai mudar e isso afeta relatórios, comissão e financeiro.

O escopo temporal (desde início / data específica / futuro) continua igual; só o "modo" é novo.

**3. Aviso visual**

Quando o admin escolhe "Recalcular", mostrar um alerta vermelho com a contagem estimada de pedidos afetados e o impacto financeiro total (`delta × soma das quantidades`), pedindo confirmação extra.

### Fora de escopo

- Não vamos rodar um recálculo retroativo agora para os pedidos da Maria Gabriela. Primeiro a ferramenta precisa existir; depois você decide quando e em qual variação aplicar.
- O relatório do portal continua somando `orders.preco` direto — está correto, é a verdade do banco.

### Arquivos afetados

- Nova migration: alterar função `public.aplicar_mudanca_preco`.
- `src/components/admin/PriceChangeDialog.tsx` — UI do novo modo.
- `src/lib/priceChangeGuard.ts` — tipos `PriceChangeTarget`/`PriceChangeResult` recebem campo `modo`.
- `mem://features/admin/retroactive-price-change` — atualizar a memória com os dois modos.
