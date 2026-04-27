## Plano para corrigir o relatório de Cobrança

Vou ajustar o relatório para que ele nunca volte zerado quando existirem pedidos já avançados no fluxo financeiro.

### O que será feito
1. Corrigir o filtro do relatório `Cobrança` em `src/components/SpecializedReports.tsx`.
   - Hoje ele inclui apenas pedidos com status `Entregue`.
   - Vou atualizar para incluir `Entregue`, `Cobrado` e `Pago`, que já fazem parte do fluxo oficial do sistema.

2. Preservar o restante da lógica atual do PDF.
   - Manter composição, quantidades, valor total, código de barras e nome do arquivo.
   - Não alterar layout nem regras de cálculo já existentes.

3. Adicionar uma proteção simples na filtragem.
   - Normalizar o status antes da comparação para evitar falhas por caixa (`Cobrado` vs `cobrado`) e reduzir risco de regressão.

4. Validar consistência com as regras do projeto.
   - O sistema já trata `Cobrado` e `Pago` como etapas financeiras válidas em outras áreas.
   - Isso alinha o PDF com o fluxo real e evita que pedidos “sumam” do relatório depois da cobrança.

### Resultado esperado
- Se houver 21 pares em `Cobrado`, o relatório de Cobrança deve trazer esses pares.
- Pedidos em `Entregue`, `Cobrado` e `Pago` passarão a aparecer corretamente no PDF.
- O relatório deixará de zerar só porque o pedido saiu de `Entregue`.

### Detalhes técnicos
- Arquivo: `src/components/SpecializedReports.tsx`
- Trecho alvo: função `generateCobrancaPDF`
- Mudança principal:
  - de: `o.status.toLowerCase() === 'entregue'`
  - para: inclusão em conjunto de status financeiros válidos, como `['entregue', 'cobrado', 'pago']`

### Observação
Não identifiquei necessidade de mudança no banco para este caso; o problema está na lógica frontend do filtro do PDF.

Aprovando, eu aplico essa correção.