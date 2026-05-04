## Remover Montserrat do PDF

A fonte Montserrat está causando erro no jsPDF (`Cannot read properties of undefined (reading '0')` no `addFont`, seguido de `widths` no `text`). Vamos abandonar a fonte customizada e voltar para Helvetica (padrão built-in do jsPDF, sempre funciona).

### Mudanças

**1. `src/lib/pdfGenerators.ts`**
- Remover o `await import('./pdfFonts')` e a chamada `registerMontserrat(doc)` da função `generateBordadoBaixaResumoPDF`.
- Deixar `FONT = 'helvetica'` fixo (já é o default).
- Remover o try/catch relacionado, simplificando o código.

**2. `src/lib/pdfFonts.ts`**
- Deletar o arquivo (não será mais usado).

**3. `src/assets/fonts/Montserrat-Regular.ttf` e `Montserrat-Bold.ttf`**
- Deletar os arquivos para limpar o repositório.

### Resultado
PDF do resumo do bordado volta a gerar normalmente usando Helvetica, sem erros.
