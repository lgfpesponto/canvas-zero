## Mudança
No PDF de Cobrança (`generateCobrancaPDF` em `src/components/SpecializedReports.tsx`, linha 1205), a ordenação atual é por número do pedido (desc) e usa data como desempate. Isso difere da listagem do portal, que ordena por `data_criacao DESC, hora_criacao DESC`.

## Ajuste
Trocar o `.sort(...)` da linha 1205 para ordenar igual ao portal:

1. `dataCriacao` desc
2. `horaCriacao` desc (desempate)
3. `numero` desc (desempate final)

Assim o PDF de cobrança lista os pedidos da data mais atual para a mais antiga, idêntico ao que aparece em "Pedidos" no portal.

## Arquivo afetado
- `src/components/SpecializedReports.tsx` (apenas a linha do `.sort` em `generateCobrancaPDF`)

Nenhuma outra lógica (filtros, composição, totais) é alterada.
