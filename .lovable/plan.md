## Objetivo
Permitir, no relatório especializado **Cobrança**, escolher quais "Progresso de Produção" (status) entram no PDF — hoje está fixo em `Entregue`.

## Mudanças (arquivo: `src/components/SpecializedReports.tsx`)

1. **Habilitar filtro de Progresso para Cobrança**
   - Em `needsProgressFilter`, incluir `activeReport === 'cobranca'`.
   - Em `progressOptions`, quando `activeReport === 'cobranca'` retornar uma lista focada nos status comuns de cobrança (ordem do fluxo):
     `['Entregue', 'Conferido', 'Cobrado', 'Pago']`
     (mantém comportamento de "Todos = todos os 4" e seleção múltipla via checkbox que já existe).

2. **Default ao abrir Cobrança = "Entregue"** (preserva comportamento atual)
   - Ao clicar no botão "Cobrança", após `resetFilters()` setar `filterProgresso` para `new Set(['Entregue'])`.
   - Implementação: ajustar o `onClick` do botão para, quando `r === 'cobranca'`, chamar `setFilterProgresso(new Set(['Entregue']))` após o reset.

3. **Ajustar `generateCobrancaPDF`**
   - Substituir o `COBRANCA_STATUSES` fixo por:
     - se `filterProgresso.size === 0` → usar `['Entregue', 'Conferido', 'Cobrado', 'Pago']` (tudo).
     - senão → usar `[...filterProgresso]` (case-insensitive como hoje).
   - Incluir o filtro selecionado no título do PDF (ex.: `Cobrança [data — vendedor — Entregue/Conferido]`) para rastreabilidade.
   - Manter o nome do arquivo atual; opcionalmente acrescentar sufixo com os status quando houver seleção.

## O que NÃO muda
- Ordenação, layout, cálculo de valores (continua usando `getOrderFinalValue` / valor congelado do banco).
- Filtro de Vendedor permanece igual.
- Outros relatórios não são afetados.

## Resultado esperado
- Ao abrir "Cobrança", aparece o seletor "Progresso de Produção" com Entregue já marcado (comportamento atual preservado).
- O usuário pode marcar Conferido / Cobrado / Pago (ou combinações) e gerar o PDF apenas com esses pedidos.
- "Nenhum" selecionado → traz todos os 4 status de cobrança.
