# Lista de comprovantes "sumida" — diagnóstico e ajuste

## O que aconteceu

Nada foi apagado. A tabela de recebimentos continua com 258 registros (de 31/03/2026 a 25/07/2026).

A tabela de comprovantes de vendedor também segue com 258 registros no mesmo intervalo.

A lista aparece vazia porque o filtro **Período** abre em "Mês atual" (agosto/2026) e não existe nenhum lançamento com data de pagamento em agosto — o mais recente é 25/07.

## Ajuste proposto

Na aba Financeiro (bloco "A Receber"), quando o período filtrado não tiver nenhum registro mas existirem registros em outros períodos, trocar a mensagem "Nenhum registro." por:

- "Nenhum registro neste período. Existem X registros em outros períodos."
- Um botão "Ver todos" que muda o filtro de período para "Todos".

O padrão do filtro continua "Mês atual".

## Detalhes técnicos

- Arquivo: `src/components/financeiro/FinanceiroAReceber.tsx`
- Manter `filterPeriodo` com default `'mes'`.
- Calcular a contagem total (lista antes do recorte por período) e usá-la na linha vazia da tabela.
- Botão chama `setFilterPeriodo('todos')`.
