# Corrigir Enter pulando "Cor do Vivo"

## Causa
A navegação por Enter ordena os campos pela posição visual do próprio controle (o botão do select), agrupando em "mesma linha" quem estiver a até 12px de distância vertical.

Em Pesponto, o rótulo "Cor da Borrachinha" quebra em duas linhas, o que empurra o seletor dela ~25px para baixo. Resultado: a ordem calculada vira Cor da Linha → Cor do Vivo → Cor da Borrachinha. Como o Enter só avança para frente, ao sair da Borrachinha o Vivo já ficou para trás e nunca recebe o foco — parece "pulado".

## Correção
Ordenar pela posição do **bloco do campo** (rótulo + controle), não do controle isolado. Assim, campos na mesma linha da grade ficam com o mesmo `top`, independentemente de o rótulo quebrar em duas linhas, e a sequência volta a ser Linha → Borrachinha → Vivo.

## Técnico
Em `src/lib/fichaNav.ts`, dentro de `getNavElements`:
- Calcular o `top` de ordenação a partir do contêiner do campo (ancestral mais próximo que contenha o `<label>` do campo — na prática o `div` que envolve rótulo + controle), com fallback para o retângulo do próprio elemento quando não houver esse contêiner.
- Manter o `left` do próprio elemento para ordenar dentro da linha e a tolerância atual de 12px.

Sem mudanças de layout, dados ou regras de negócio.
