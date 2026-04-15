

## Plano: Validação de variações ao restaurar rascunho

### Problema
Rascunhos restauram valores diretamente do localStorage sem verificar se as variações ainda existem na ficha atual — mesmo problema que os modelos tinham antes da correção.

### Solução
Reutilizar a mesma lógica de `validateAndPopulateTemplate` já implementada para modelos, aplicando-a aos dados do rascunho quando o formulário é inicializado.

### Alterações

#### Arquivo: `src/pages/OrderPage.tsx`

1. **Extrair a lógica de validação** que hoje está dentro de `validateAndPopulateTemplate` para uma função reutilizável `validateFormData(fd)` que retorna `{ cleanedData, warnings }` sem efeito colateral (sem chamar `populateFormFromTemplate`)

2. **Aplicar validação ao carregar rascunho**: No bloco de inicialização (onde `df = draftState?.form || {}`), se `draftState` existir, rodar `validateFormData(df)` para limpar valores fantasma e mostrar toast de aviso

3. **Usar os dados limpos** como valores iniciais dos `useState` em vez dos dados brutos do rascunho

4. **Manter `validateAndPopulateTemplate`** chamando `validateFormData` internamente para não quebrar o fluxo de modelos

### Detalhe técnico
Como a validação depende de arrays que são construídos com dados do banco (`mergedBordadoCano`, `MODELOS`, etc.), e esses dados podem não estar disponíveis no momento da inicialização dos `useState`, a validação será executada em um `useEffect` que roda uma vez quando os dados do banco carregam, limpando os campos inválidos e mostrando o toast.

### O que NÃO muda
- Fluxo de salvar rascunho permanece idêntico
- Layout e campos do formulário não mudam
- Lógica de modelos continua funcionando
- Preços e filtros dinâmicos não são afetados

