# Estender as novas variações de couro para os extras

Os extras que pedem **Tipo de Couro** e **Cor do Couro** (Kit Canivete, Kit Faca, Chaveiro c/ Carimbo a Fogo, Bainha de Cartão e Bota Pronta Entrega) não usam as variações do banco — usam as listas estáticas em `src/lib/orderFieldsConfig.ts` (`TIPOS_COURO`, `CORES_COURO`, `getCoresCouroFiltradas`).

Para refletir as mesmas regras já aplicadas na ficha Bota, basta alterar esse arquivo.

## Mudanças em `src/lib/orderFieldsConfig.ts`

1. **`TIPOS_COURO`** — adicionar `'Estilizado em Madeira'` ao final da lista.
2. **`CORES_COURO`**:
   - remover `'Madeira'`
   - adicionar `'Nescau Chapado'`
3. **`COURO_CORES_EXCLUSIVAS`** — adicionar entrada para travar o vínculo:
   ```
   'Estilizado em Madeira': ['Mostarda']
   ```
   Isso garante que, ao escolher o tipo "Estilizado em Madeira", a única cor disponível seja "Mostarda" (mesma regra da ficha Bota).

Sem preço adicional para "Estilizado em Madeira" (não entra em `COURO_PRECOS`).

## O que muda na prática

- Kit Canivete, Kit Faca, Chaveiro c/ Carimbo a Fogo, Bainha de Cartão: lista de tipo passa a incluir "Estilizado em Madeira" (com cor travada em Mostarda) e a lista de cor passa a incluir "Nescau Chapado" e não mostra mais "Madeira".
- Bota Pronta Entrega (sub-itens): mesmo comportamento nas listas de tipo/cor.

## Sem alterações de banco

As variações dos extras vivem apenas no código — nenhum INSERT/DELETE em `ficha_variacoes` é necessário para esta tarefa.
