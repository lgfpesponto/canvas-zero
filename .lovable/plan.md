## Objetivo

Adicionar ao relatório de **Palmilha** o mesmo filtro opcional **"Número do estoque"** que já existe na Escalação, filtrando pedidos cujo número começa com o prefixo informado (ex: `E009`).

## Mudanças em `src/components/SpecializedReports.tsx`

1. **`generatePalmilhaPDF`** (linhas ~638-682):
   - Aplicar o mesmo filtro de prefixo de número usado na Escalação:
     ```ts
     const estoquePrefix = filterNumeroEstoque.trim().toLowerCase();
     ...
     (!estoquePrefix || (o.numero || '').toLowerCase().startsWith(estoquePrefix))
     ```
   - Incluir `ESTOQUE {label}` no título do PDF e no nome do arquivo quando preenchido.
   - Adicionar `numeroEstoque` nos filtros do `registrarPdfSnapshot`.

2. **Resumo de confirmação (`mostrarFiltros`, linha ~1548):**
   - Estender a condição para incluir `'palmilha'` além de `'escalacao'` ao listar "Número do estoque".

3. **UI do filtro (linha ~1784):**
   - Trocar `activeReport === 'escalacao'` por `(activeReport === 'escalacao' || activeReport === 'palmilha')` para que o input apareça também na Palmilha.

Nenhuma outra alteração — layout do PDF, agrupamento por forma e demais filtros permanecem iguais.
