# Metais: passar por todos os 5 campos, e sugestão de Cor da Linha para todas as cores

## 1. Metais Tem/Não tem (Strass, Bola Grande, Cruz, Bridão, Cavalo)

São 5 cartões na grade (3 na primeira linha, 2 na segunda). O Enter deve parar em cada um, na ordem da esquerda para a direita, primeira linha e depois a segunda; quando marcar "Tem", parar também no campo de quantidade antes de seguir. Depois do último (Cavalo) o Enter vai para Acessórios.

Técnico (`src/pages/OrderPage.tsx`, grade dos metais quantificáveis):
- Cada `<select>` já recebeu `data-ficha-filled="false"`; aplicar o mesmo tratamento ao input de quantidade (`data-ficha-filled` fica normal — ele é pulado quando já tem número, o que é o comportamento desejado).
- Envolver cada cartão com `data-ficha-nav-order` não é necessário: a ordem já é calculada pela posição visual em `getNavElements`. O que falta é garantir que a lista seja recalculada depois de o cartão crescer com o campo de quantidade — em `focusNextFrom`, o cálculo já ocorre a cada chamada, então basta validar no preview que os 5 são visitados e ajustar a tolerância de linha (hoje 12px) se os cartões da mesma linha tiverem topos ligeiramente diferentes.

## 2. Cor da Linha: sugestão para todas as cores

Hoje só sugere quando o couro é marrom/nescau/café/chocolate (vira Café). Branco e preto não sugerem porque a lista de Cor da Linha usa forma feminina ("Branca", "Preta", "Vermelha") e a sugestão procura "Branco"/"Preto". As cores compostas do couro ("Rosa Neon", "Nescau Chapado", "Preto e Branco") também não encontram equivalente.

Regra final:
- marrom, nescau, café, chocolate, caramelo, whisky, tabaco, cappuccino, castor, havana, pinhão → **Café**
- preto, malhado, preto e branco → **Preta**
- branco, off white, cru, areia, bege → **Branca** (bege → **Bege** quando existir na lista)
- rosa e rosa neon → **Rosa**; vermelho → **Vermelha**; azul e petróleo → **Azul**; verde → **Verde**; amarelo e mostarda → **Amarelo**; laranja e telha → **Laranja**
- qualquer outra → a cor equivalente da lista, comparada de forma tolerante a gênero (branco/branca, preto/preta, vermelho/vermelha)

Técnico (`src/lib/corSugestoes.ts`):
- Reescrever `sugerirCorLinha` com esse mapa por palavra-chave, retornando o rótulo exato de `COR_LINHA`.
- Tornar a comparação de `ordenarComSugestao` e `ehSugerida` tolerante a gênero: normalizar removendo a vogal final (`branco`/`branca` → `branc`) antes de comparar, para o rótulo sugerido casar com a opção real da lista.
- Nenhuma mudança de preço ou de obrigatoriedade; só a ordenação e a etiqueta "sugerido".
