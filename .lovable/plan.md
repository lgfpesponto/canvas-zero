## Correções no popover de edição da ficha (modo edição)

Quatro melhorias para o comportamento do lápis (✎) do modo edição, sem tocar em lógica de pedidos antigos.

### 1. Pré-carregar preço atual dos metais / extras "tem/não tem"

Hoje o popover abre com "Preço quando 'Tem' (R$)" em **0** quando o campo `ficha_campos.opcoes` ainda não foi semeado no banco (é o caso de `bola_grande`, `cruz_metal`, `bridao_metal`, `cavalo_metal`, `strass` e alguns extras).

Correção:
- No `FichaFieldControls`, quando o campo é do tipo `checkbox` e `opcoes` estiver vazio/zerado, exibir o **fallback hardcoded** (`getDynamicUnitPrice(slug, 0)` já dá acesso a esse valor) como valor inicial editável. Salvar continua gravando em `opcoes[0].preco_adicional`.
- Assim o admin vê imediatamente o preço vigente (ex.: Bola Grande = R$0,60) e pode alterar sem digitar do zero.

### 2. Cinto: variações de Tamanho, Tipo de Couro, Cor do Couro, Fivela, Cor do Bordado

Os campos existem no formulário, mas as variações não aparecem porque **os `ficha_campos` correspondentes ainda não têm registros de `ficha_variacoes`** para o tipo `cinto`. As opções ficam só nas constantes de `extrasConfig.ts` / `orderFieldsConfig.ts`.

Correção (migration):
- Garantir que exista um `ficha_campos` `selecao` para cada slug abaixo dentro da `ficha_tipos` do cinto e semear `ficha_variacoes` a partir das constantes atuais, com preço = valor da constante quando aplicável:
  - `tamanho` ← `BELT_SIZES`
  - `tipo_couro` ← `TIPOS_COURO` (compartilhado, mas filtrado para o que faz sentido em cinto)
  - `cor_couro` ← `CORES_COURO`
  - `fivela` ← `FIVELA_OPTIONS`
  - `cor_bordado` (dentro da categoria "Bordado P") ← paleta padrão de cores de bordado já usada na bota
- Nenhum pedido antigo muda: os preços vêm iguais aos das constantes; a UI passa a ler do banco por meio dos hooks já existentes.

### 3. Carimbo a Fogo (bota e cinto): editável + variações

Hoje "Carimbo a Fogo" na `OrderPage` (bota) sequer tem `<FichaFieldControls>` acoplado, e na `BeltOrderPage` só existe o subcampo "Quais carimbos" (`texto`).

Correção:
- Adicionar `<FichaFieldControls labelText="Carimbo a Fogo" defaultTipo="selecao" defaultCategoriaSlug="carimbo" />` no label principal em `OrderPage.tsx` e `BeltOrderPage.tsx`.
- Incluir no `labelSlugMap` (bota e cinto) o mapeamento `carimbo a fogo → carimbo`.
- Migration: criar `ficha_campos` `selecao` `carimbo` para cinto e bota (se ainda não existir) e semear `ficha_variacoes` a partir de `CARIMBO` / `BELT_CARIMBO`.

### 4. Todos os campos: nome + obrigatoriedade sempre editáveis

Já é possível para a maioria; ajustes:
- No `FichaFieldControls`/`EditPopover`, sempre exibir o **switch "obrigatório"** (inclusive nos tipos `texto`/`textarea`/`numero`) e persistir em `ficha_campos.obrigatorio`. O valor inicial já vem de `campo?.obrigatorio` — nenhuma mudança extra necessária, só remover o `!isTexto` que esconde o switch hoje.
- Campos condicionais (que só aparecem depois de selecionar algo, ex.: "Descrever fivela", "Cor do Bordado", "Descrição do Bordado", subcampos de carimbo etc.) usam o mesmo componente — o popover continua funcionando via lápis mesmo quando o campo está oculto porque o toggle é renderizado no `<label>`, que já existe em edit mode. Adicionar os slugs faltantes ao `labelSlugMap` para que o lápis apareça:
  - Bota/Cinto: `descrever fivela → fivela_desc`, `descrição do bordado → bordado_desc`, `descrição → nome_bordado_desc`, `cor → nome_bordado_cor`, `fonte → nome_bordado_fonte`, `quais carimbos → carimbo_desc`, `onde será aplicado → carimbo_onde`, `valor do adicional → adicional_valor`, etc.

Semântica de "obrigatório em campo condicional": nada muda na validação atual dos formulários — o campo condicional já só é renderizado quando a condição é satisfeita, então marcá-lo `obrigatorio` no banco naturalmente só o exige quando ele aparece. Documentar isso em comentário no `FichaFieldControls`.

### Detalhes técnicos

Arquivos alterados:
- `src/components/ficha-edit/FichaFieldControls.tsx` — fallback de preço para checkbox; remover `!isTexto` do switch de obrigatoriedade.
- `src/components/ficha-edit/labelSlugMap.ts` — novos slugs (carimbo a fogo, subcampos condicionais de cinto/bota).
- `src/pages/OrderPage.tsx`, `src/pages/BeltOrderPage.tsx` — acoplar `<FichaFieldControls>` no label "Carimbo a Fogo".
- Migration Supabase: upsert de `ficha_campos` (`carimbo`, `tamanho`, `tipo_couro`, `cor_couro`, `fivela`, `cor_bordado` no cinto) + insert idempotente de `ficha_variacoes` a partir das constantes.

Compatibilidade com pedidos antigos: preços semeados = constantes atuais; `getDynamicUnitPrice` mantém fallback; nenhuma alteração em `recomputeOrderPrice`.