## Objetivo
Nos campos de "Tipo do Couro" / "Cor do Couro" da Bota, Cinto e Extras, quando o tipo selecionado for **Látego**, disponibilizar as cores **Whisky** e **Caramelo** (além das cores já existentes hoje para Látego, incluindo Marrom).

## Onde alterar
Tudo se resolve em `src/lib/orderFieldsConfig.ts` — Bota (Cano/Gáspea/Taloneira), Cinto e Extras consomem a mesma função `getCoresCouroFiltradas`, então uma única mudança cobre os três fluxos.

## Mudanças

1. **`CORES_COURO`**: adicionar `'Whisky'` (não existe hoje). `'Caramelo'` já existe.
2. **`CORES_EXCLUSIVAS_REAIS`**: incluir `'Whisky'` para que ela nunca apareça em outros tipos que não Látego. `'Caramelo'` continua na lista (hoje ligada a Vaca Pintada) e passa a ganhar Látego como segundo tipo permitido.
3. **`CORES_RESTRITAS`**: adicionar duas entradas:
   - `'Whisky': ['Látego']`
   - `'Caramelo': ['Látego']` (Vaca Pintada continua funcionando via lista fechada em `COURO_CORES_EXCLUSIVAS`, que é consultada antes das restritas).

Resultado prático:
- Látego → mostra as cores gerais + `Marrom` + `Whisky` + `Caramelo`.
- Vaca Pintada → continua mostrando apenas `Caramelo` e `Preto e Branco` (inalterado).
- Demais tipos → não mostram `Whisky` nem `Caramelo`.

## Fora do escopo
- Sem mudanças em preços, PDFs, admin de fichas, banco ou lógica de bordado — só a lista de cores permitidas por tipo.