## Adicionar filtro de Vendedor ao relatório de Escalação

Hoje o filtro "Vendedor" aparece apenas para os relatórios de Expedição e Cobrança. Vou habilitá-lo também para Escalação, mantendo o comportamento padrão (`Todos vendedores`) e refletindo a escolha no PDF.

### Alterações em `src/components/SpecializedReports.tsx`

1. **Mostrar o seletor de Vendedor na Escalação**
   - Incluir `'escalacao'` em `needsVendedorFilter` (linha 1865), para que o `<Select>` de vendedor apareça na UI do relatório.

2. **Aplicar o filtro em `generateEscalacaoPDF` (linhas 481–526)**
   - No `sourceOrders.filter`, somar a condição `(filterVendedor === 'todos' || o.vendedor === filterVendedor)`.
   - No cabeçalho do PDF, acrescentar o vendedor escolhido junto da data/progresso (ex.: `ESCALAÇÃO — BAIXA CORTE — TODOS VENDEDORES — 20/05/2026`).
   - Incluir o vendedor no nome do arquivo: `Escalação - {progresso} - {vendedor} - {data}.pdf`.
   - Registrar no snapshot (`registrarPdfSnapshot`) o filtro `vendedor` junto de `progresso`.

3. **Confirmação antes de imprimir**
   - O bloco que monta o `ReportConfirmSummary` já inclui automaticamente a linha de Vendedor quando `needsVendedorFilter` é true (linha 1827), então nada muda além do passo 1.

### Comportamento esperado

- Ao abrir Escalação, o usuário verá o seletor de Vendedor logo abaixo do filtro de Progresso.
- Selecionar um vendedor filtra os pedidos antes do agrupamento por solado/bico/cor, sem alterar a lógica de blocos atual.
- Manter "Todos vendedores" preserva o relatório como é hoje.

Nenhuma mudança em backend, schema ou outras telas.
