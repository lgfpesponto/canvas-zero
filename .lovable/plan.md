## Diagnóstico

Ao criar uma nova variação em "Cor Couro do Cano/Gáspea/Taloneira" pelo editor de ficha, o registro é gravado corretamente em `ficha_variacoes` (verificado no código de `useInsertVariacao`), mas nunca aparece no "Faça seu pedido".

Motivo: em `src/pages/OrderPage.tsx`, o select de cor de couro chama `getDynCoresCouro(...)` → `getCoresCouroFiltradas(tipoCouro)` (em `src/lib/orderFieldsConfig.ts`), que devolve **apenas a lista hardcoded** `CORES_COURO`. As variações do banco simplesmente não são lidas para este campo. O mesmo padrão vale para vários outros selects da bota que hoje leem só constantes: `TIPOS_COURO`, `BORDADOS_*`, `LASERS_*`, `RECORTES_*`, `FORMATO_BICO`, `COR_SOLA`, `COR_VIRA`, `SOLADOS`, metais e acessórios. Ou seja: "editar preço" funciona porque o preço vai pelo lookup, mas "criar nova opção" não aparece em nenhum desses campos.

## O que fazer

Fazer os selects mesclarem a lista hardcoded (que continua servindo de base + regras de compatibilidade) com o que existe em `ficha_variacoes` para o mesmo campo, e usar `getFilteredOptions` do `useDynamicFieldFilter` quando a variação nova tiver `relacionamento` definido. Assim toda variação nova criada pelo editor aparece imediatamente, sem quebrar as regras já existentes (ex.: PVC + Marrom = R$0, cores exclusivas por tipo de couro).

### Passos

1. **Novo helper `useFichaFieldOptions(campoSlug)`** em `src/hooks/` que devolve `{ nome, preco, relacionamento }[]` lidos de `ficha_variacoes` para um campo (reaproveitando o cache de `useFichaVariacoesLookup`).
2. **`getDynCoresCouro` (bota)** passa a:
   - Partir de `getCoresCouroFiltradas(tipoCouro)` (mantém regras fechadas/restritas hardcoded).
   - Unir com nomes de variações do banco para `cor_couro_cano/gaspea/taloneira`.
   - Se a variação do banco tiver `relacionamento.couro_cano` (ou análogo), respeitar via `getFilteredOptions` — só aparece quando o tipo de couro selecionado bater.
3. **Tipos de couro** (`getDynCourosPorArea` ou equivalente): igual mesclagem para `couro_cano/gaspea/taloneira`, respeitando `TIPOS_COURO` como base.
4. **Demais selects que hoje só usam constantes** (`BORDADOS_CANO/GASPEA/TALONEIRA`, `LASERS_*`, `RECORTES_*`, `FORMATO_BICO`, `COR_SOLA`, `COR_VIRA`, `SOLADOS`, `TIPO_METAL`, `COR_METAL`, `ACESSORIOS`, `COR_LINHA`, etc.): aplicar o mesmo padrão de "constante ∪ ficha_variacoes do campo", respeitando `getFilteredOptions` quando houver relacionamento.
5. **Preço das opções vindas só do banco**: continuar usando `findFichaPriceContextual` para calcular subtotais — já está pronto, só precisa ser chamado para as opções novas.
6. **Cinto** (`EditBeltPage`/`BeltOrderPage`): mesma mesclagem para `cor_couro`, `tipo_couro`, `bordado`, `laser`, `recorte`, `fivela`, `cor_fivela` etc.
7. **Invalidação**: já feita em `useInsertVariacao` para `ficha_variacoes_lookup` e `dynamic_field_filter_bota` — nada a mudar.

### Não muda

- Não altera regras de negócio de preços já definidas.
- Não altera o editor de ficha em si (o insert já funciona).
- Não mexe em `custom_options` — segue lendo pelo `useCustomOptions` como hoje.

## Como testar

1. Abrir bota → editar ficha → em "Cor Couro do Cano" adicionar "Teste Novo" com R$ 12.
2. Voltar ao formulário → escolher qualquer tipo de couro sem lista fechada → "Teste Novo" deve aparecer no select com preço R$ 12 no total.
3. Editar a variação nova, adicionar relacionamento `couro_cano = ['Látego']` → salvar → agora "Teste Novo" só aparece quando Látego estiver selecionado.
4. Repetir para tipo de couro, bordado, laser, formato do bico, cor da sola, solado, metal etc.
