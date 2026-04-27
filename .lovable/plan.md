## Problema

Na ficha "Faça seu Pedido" da bota, os 3 selects "Recortes do Cano", "Recortes da Gáspea" e "Recortes da Taloneira" aparecem vazios porque:

1. A tabela `ficha_variacoes` não possui nenhuma variação cadastrada para os campos `recorte_cano`, `recorte_gaspea`, `recorte_taloneira` (os campos existem em `ficha_campos`, mas sem opções).
2. O hook `useFichaVariacoesLookup` (que alimenta o select do formulário) tem um `CATEGORY_MAP` que ainda não inclui as três categorias de recorte — então mesmo se as variações existissem, elas não chegariam ao formulário.

## O que vai ser feito

1. **Cadastrar as 4 variações** (Anjo, Borda, Touro Brinco, Touro Recortado) em cada um dos 3 campos de recorte na tabela `ficha_variacoes`, com `preco_adicional = 0` (preço pode ser ajustado depois pelo admin) e `ativo = true`. Total: 12 inserts (4 variações × 3 campos).

2. **Atualizar `src/hooks/useFichaVariacoesLookup.ts`** adicionando ao `CATEGORY_MAP` as três entradas:
   - `recorte_cano` → `recorte_cano`
   - `recorte_gaspea` → `recorte_gaspea`
   - `recorte_taloneira` → `recorte_taloneira`

   Assim os selects do formulário passam a listar as variações vindas do banco.

## Resultado esperado

Ao abrir a ficha de produção da bota, os campos "Recortes do Cano", "Recortes da Gáspea" e "Recortes da Taloneira" passam a oferecer as 4 opções: Anjo, Borda, Touro Brinco, Touro Recortado. Como já estão integrados ao `getDbItems` + `findPrice`, qualquer ajuste futuro de preço feito no painel admin (Variações) reflete automaticamente no cálculo do total.

Nada na lógica de cálculo, persistência, edição ou PDF muda — os campos já estavam preparados, só faltava popular as opções e habilitar o mapeamento.
