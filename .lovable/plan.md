Hoje `FICHA_FILTER_KEYS` está fixo em 5 campos (`modelo`, `tipo_couro_cano`, `tipo_couro_gaspea`, `solado`, `genero`). Vamos torná-lo **dinâmico**, lendo os campos da versão vigente da ficha (`ficha_campos` do tipo `bota` e/ou `cinto`), para que qualquer campo da ficha vire filtro — acessórios, metais, cor do solado, formato do bico, etc.

## O que muda

### 1. Novo hook `useFichaFilterKeys(tipos)`
Local: `src/lib/fichaFilterKeys.ts` (ou hook novo em `src/hooks/`).

- Recebe uma lista de tipos de ficha ativos (ex.: `['bota']`, `['cinto']` ou `['bota','cinto']`).
- Busca `ficha_tipos` + `ficha_campos` (só `ativo=true`, ordenados por `ordem`).
- Retorna `FichaFilterKey[] = { key: slug, label: nome, tipo: 'bota'|'cinto' }`.
- Sem hardcode: qualquer campo novo criado no admin aparece automaticamente.

### 2. Ajuste em `buildFichaOptions` / `matchesFichaFilters`
- Passam a receber a lista dinâmica de keys em vez de importar a constante.
- Mesmo contrato AND-entre-categorias / OR-dentro-da-categoria.
- Adiciona filtro "vazio": só inclui uma categoria no diálogo se pelo menos um item tiver valor para ela (já é o comportamento hoje via `Set` — segue igual).

### 3. `FichaFiltersDialog`
- Recebe também `keys: FichaFilterKey[]` (para saber label + ordem correta vinda do admin).
- Renderiza blocos na ordem de `ficha_campos.ordem`.
- Busca por palavra-chave continua filtrando label + valores.

### 4. Chamadas

**`src/pages/ModelosPage.tsx`**
- Usa `useFichaFilterKeys(['bota','cinto'])` (a página mistura os dois).
- Ao montar `fichaOptions`, para cada modelo passa como snapshot o `form_data` do modelo (com fallback `genero` já existente).

**`src/components/template/TemplatesDialog.tsx`**
- Recebe nova prop opcional `tipo?: 'bota'|'cinto'` (já é conhecido nos dois callers — `OrderPage` e `BeltOrderPage`).
- Usa `useFichaFilterKeys([tipo ?? 'bota'])` para restringir aos campos da ficha correta.

### 5. Sempre versão atualizada
- Não olhar `ficha_snapshot`/versão do template. Sempre lê `ficha_campos` "hoje" (mesma fonte que o admin usa). Se um campo foi removido da ficha, some do filtro; se foi adicionado, aparece.
- Como os valores vêm de `form_data` do template, campos novos só terão opções nos modelos que já foram salvos com eles — comportamento esperado.

## Detalhes técnicos

- Query única com `staleTime: 30_000` (cacheável, poucos rows).
- Campos do tipo "grupo/label puro" (sem variações e sem valor em `form_data`) ficam automaticamente ocultos porque `buildFichaOptions` gera `Set` vazio.
- Nenhuma migração de banco. Nenhum novo endpoint.
- `EstoquePage` **não** é alterada nesta task (mantém o comportamento atual). Se quiser depois unificar, é trivial — mesmo hook.

## Fora de escopo
- Persistência de filtros entre sessões.
- Filtros em telas de pedido/estoque.
- Alterar `ficha_snapshot` ou lógica de validade de template.