## Diagnóstico

Rodei o banco e o `form_data` dos templates usa **camelCase** (`tipoCouroCano`, `corSola`, `formatoBico`, `corVira`…), enquanto `ficha_campos.slug` é **snake_case** (`couro_cano`, `cor_sola`, `formato_bico`, `cor_vira`…). Por isso os campos "não apareciam": as chaves não batiam. Também estamos hoje incluindo campos livres (`textarea`, `texto`, `numero`) e valores booleanos falsos, que poluem o modal.

## O que muda em `src/lib/fichaFilterKeys.ts`

### 1. Só campos "selecionáveis"
No hook `useFichaFilterKeys` filtrar `ficha_campos.tipo` para manter apenas:
- `selecao` (dropdown)
- `multipla` (multi-select)
- `checkbox` (booleano)

Descartar `texto`, `textarea`, `numero`, `foto`, `data` etc. → Observação, Descrição Adicional, Valor Adicional, Nº do Pedido, Vendedor, Cliente, Link da Foto, Cor do Bordado (texto), Descrição do Tricê etc. somem do modal.

### 2. Ordem correta
Já estamos ordenando por `ficha_campos.ordem`. Vamos reforçar: quando o mesmo `slug` existe em bota e cinto, mantém o menor `ordem`. Ordenação final estável por `ordem` asc.

### 3. Mapeamento snake → camel + overrides
Adicionar helper `resolveFormKey(slug)` que, para cada slug do `ficha_campos`, devolve a lista de possíveis chaves em `form_data`, na ordem:
1. o próprio slug (`cor_sola`)
2. camelCase (`corSola`, `formatoBico`, `corVira`, `corCouroCano`…)
3. overrides explícitos para os "tipo*" das bota (o `form_data` usa `tipoCouroCano/Gaspea/Taloneira`, enquanto o `ficha_campos.slug` é `couro_cano/gaspea/taloneira`):
   - `couro_cano` → `tipoCouroCano`
   - `couro_gaspea` → `tipoCouroGaspea`
   - `couro_taloneira` → `tipoCouroTaloneira`
   - `tipo_couro` (cinto) → `tipoCouro`
   - `cor_couro` (cinto) → `corCouro`

`buildFichaOptions` e `matchesFichaFilters` passam a usar `resolveFormKey` — pega o primeiro alias que exista com valor no snapshot.

### 4. Valores por tipo de campo
No `buildFichaOptions`, tratamento por `campo_tipo`:
- `selecao`: incluir string não vazia.
- `multipla`: se valor for array, expandir cada string como uma opção; se for string separada por vírgula, split.
- `checkbox`: se `true` (ou `"true"`), adicionar um único chip `"Sim"`. Nunca `"false"`.

`matchesFichaFilters` já cobre boolean → `"Sim"` (adicionado antes). Reforçar array: qualquer item do array bate com algum chip selecionado (OR intra-categoria).

## Nada muda visualmente no `FichaFiltersDialog`
Continua renderizando na ordem que recebe `keys` (já vem ordenado pelo hook) e continua ocultando categorias com `opts` vazio.

## Resultado esperado no modal (bota)
Aparecem, entre outros: Tamanho, Gênero, Modelo, Solado, Formato do Bico, Cor da Sola, Cor da Vira, Tipo Couro do Cano, Cor do Couro do Cano, Tipo Couro da Gáspea, Cor do Couro da Gáspea, Tipo Couro da Taloneira, Cor do Couro da Taloneira, Bordado do Cano/Gáspea/Taloneira, Laser do Cano/Gáspea/Taloneira, Recortes, Área/Tipo/Cor do Metal, Acessórios, Tricê (Sim), Corrente (Sim), Tiras (Sim), Franja (Sim), Estampa (Sim), Costura Atrás (Sim), Nome Bordado (Sim), Strass (Sim), Cruz/Bridão/Cavalo (Sim), Pintura (Sim), Cor da Borrachinha, Cor do Vivo, Cor da Linha, Cor Glitter, Desenvolvimento, Carimbo. Ordem = `ficha_campos.ordem`.

Somem: Observação, Descrição Adicional, Valor Adicional, Cor do Bordado (texto livre), qualquer descrição/texto/número.

## Fora de escopo
- `EstoquePage` (mantém como está).
- Persistência entre sessões.
- Alterar `ficha_snapshot`/validade.