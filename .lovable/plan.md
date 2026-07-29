## Mudança

Na página Estoque, no diálogo **Compartilhar vitrine**, remover:
- Campo **Buscar modelo**
- Chips de **Tamanhos**

Esses filtros continuam funcionando **dentro** do link público (vitrine) — onde já foram adicionados na iteração anterior — mas não aparecem mais na geração do link.

## Arquivo

- `src/components/estoque/CompartilharVitrineDialog.tsx`: remover a UI de busca e de chips de tamanho, e também os estados/props relacionados (`buscaLocal`, `tamanhosSelecionados`, `tamanhosDisponiveis`, contador dependente).

O payload do link volta a refletir apenas os filtros já aplicados na página Estoque (busca principal e filtros da ficha/tamanho da própria página), sem escopo extra dentro do diálogo.
