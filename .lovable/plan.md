## Problema

Hoje o modelo "Bota Montaria (40)" só aparece no select de Modelo da ficha de produção quando o tamanho selecionado está entre **34 e 40**. Em qualquer outro tamanho ela some, por isso parece que "não está mostrando".

## Solução

Liberar "Bota Montaria (40)" para aparecer em **todos os tamanhos** (24 a 45), mantendo a lógica de filtro dos demais modelos intacta.

## Mudança técnica

Arquivo: `src/lib/orderFieldsConfig.ts`, função `getModelosForTamanho`.

- Hoje: `Bota Montaria (40)` é adicionada à lista `allowed` apenas dentro do bloco `t >= 34 && t <= 40`.
- Depois: adicionar `Bota Montaria (40)` à lista `allowed` em qualquer faixa válida (infantil 24–33 e adulto 34–45), de forma que sempre apareça quando houver tamanho selecionado.

Nenhuma outra regra (preços, blocos de vinculação, dependências de couro/bordado) é alterada. Não há mudança no banco de dados.

## Observação sobre o nome

O modelo continua exibido como "Bota Montaria (40)" na lista. Se você quiser renomear para "Cano Montaria", me avise depois que esta mudança estiver aplicada que faço o ajuste do rótulo.
