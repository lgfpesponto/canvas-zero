# Filtro de Data no Relatório de Corte

## Objetivo
Adicionar um filtro opcional de **intervalo de datas (de / até)** no relatório de **Corte**, baseado na **data de criação** do pedido (`dataCriacao`). Por padrão fica vazio (todos os pedidos), mantendo o comportamento atual.

## Mudanças

Arquivo único: `src/components/SpecializedReports.tsx`

1. **Novos estados** (junto com os filtros existentes, ~linha 375):
   - `filterDataDe: string` (formato `YYYY-MM-DD`)
   - `filterDataAte: string` (formato `YYYY-MM-DD`)

2. **Reset** — incluir os dois campos em `resetFilters()` (~linha 396).

3. **Helper de filtro de data** — função `dataMatches(dataCriacao: string)` que:
   - Retorna `true` se ambos os campos estão vazios.
   - Compara `dataCriacao` (já em `YYYY-MM-DD`) com `filterDataDe` / `filterDataAte` usando comparação lexicográfica (funciona pois ISO).

4. **Aplicar no `generateCortePDF`** (~linha 956):
   - Adicionar `&& dataMatches(o.dataCriacao)` ao `.filter(...)`.
   - Atualizar a linha do cabeçalho do PDF (~linha 993) para incluir o intervalo quando preenchido:  
     `Filtro: {progressoLabel} | Período: {de} a {até} | Total: ... | {dataBR}`  
     Quando vazio, omite o trecho "Período".

5. **UI dos filtros** (~linha 1576, dentro do bloco `activeReport && ...`):
   - Adicionar um novo bloco mostrado **somente quando `activeReport === 'corte'`**, abaixo do filtro de Progresso.
   - Layout: dois inputs `<input type="date">` lado a lado com labels "De" e "Até", + botão "Limpar datas" pequeno.
   - Mesmo padrão visual dos demais filtros (`bg-background border border-input rounded-md px-3 py-2 text-sm`).

## Detalhes Técnicos

- `Order.dataCriacao` já é string `YYYY-MM-DD` (vide `formatDateBR` na linha 25 que faz split por `-`), portanto comparação direta de strings é válida e evita problemas de timezone.
- Filtro é **inclusivo** nas duas pontas (`>=` De e `<=` Até).
- Se só "De" estiver preenchido → filtra dessa data em diante. Se só "Até" → até essa data. Os dois vazios → todos.
- Não altera o comportamento de outros relatórios (escalação, forro, palmilha, etc.) — fica restrito ao Corte conforme solicitado.

## Esboço de UI

```text
[ Progresso de Produção: Todos ▾ ]

Período de criação (opcional)
De: [ 2026-04-01 ]   Até: [ 2026-04-28 ]   Limpar datas

[ GERAR PDF ]
```
