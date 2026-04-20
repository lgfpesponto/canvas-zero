

## Histórico de Impressão dos Pedidos

Adicionar rastreamento de impressões: toda vez que uma ficha PDF de um pedido for gerada, registrar quem imprimiu, quando, e mostrar um ícone de impressora no card do pedido.

## Como vai funcionar

### 1. Novo campo no banco

Adicionar coluna `impressoes` (jsonb, default `[]`) na tabela `orders`. Cada item:
```json
{ "data": "2026-04-20", "hora": "14:32", "usuario": "Juliana ADM", "tipo": "Ficha de Produção" }
```
- Migration cria a coluna sem mexer em nada existente
- `dbRowToOrder` e `orderToDbRow` em `src/lib/order-logic.ts` ganham o mapeamento
- Tipo `Order` em `AuthContext.tsx` ganha `impressoes?: { data; hora; usuario; tipo }[]`

### 2. Registro automático ao imprimir

Onde já chamamos `doc.save(...)` para fichas/relatórios de pedidos específicos, gravamos a impressão dos pedidos envolvidos:

- **`generateProductionSheetPDF`** (Ficha Sagrada A5) → registra em **todos** os pedidos da lista, tipo `"Ficha de Produção"`
- **`generateReportPDF`** (Relatório por Filtros) → registra tipo `"Relatório de Pedidos"`
- **Relatórios especializados** em `SpecializedReports.tsx` (Corte, Bordados, Pesponto, Forro, Forma, Palmilha, Metais, Expedição, Cobrança, Escalação, Extras) → cada um registra com seu próprio tipo (ex: `"Relatório de Corte"`)
- **`SoladoBoard.tsx`** e **`PiecesReportPage.tsx`** → registram com tipo correspondente

Implementação: nova função utilitária `registerOrderPrints(orderIds: string[], tipo: string, usuario: string)` em `src/lib/printHistory.ts` que faz um `update` em batch — busca os `impressoes` atuais e adiciona o novo registro. Roda em background (sem await bloqueante na UX).

### 3. Visual no card do pedido (`OrderCard.tsx`)

Quando `order.impressoes?.length > 0`, mostra ícone `Printer` (lucide-react) ao lado do número do pedido, com badge contador se >1:
```
7E-AB1234 🖨️3   — Juliana
```
Tooltip ao passar o mouse: "Impresso 3x — última: 20/04 14:32"

### 4. Aba na página de detalhes (`OrderDetailPage.tsx`)

Junto da grid `Histórico de Produção | Histórico de Alterações`, transformar em 3 colunas em telas grandes (ou empilhar em telas menores) adicionando **Histórico de Impressão**:
```
┌─ Produção ─┐ ┌─ Alterações ─┐ ┌─ Impressões ─┐
│ ...        │ │ ...          │ │ 20/04 14:32  │
│            │ │              │ │ Juliana ADM  │
│            │ │              │ │ Ficha Prod.  │
└────────────┘ └──────────────┘ └──────────────┘
```
Lista cronológica reversa (mais recente primeiro), com ícone de impressora.

## Detalhes técnicos

- **Quem imprimiu**: pega `user.nome_completo` (ou `nome_usuario` como fallback) do `useAuth()` no momento do clique no botão de impressão
- **Data/hora**: usa `formatBrasiliaDate()` e `formatBrasiliaTime()` (já existentes), igual ao `historico` e `alteracoes`
- **Performance**: o registro é assíncrono e não bloqueia o `doc.save()` — se falhar, não atrapalha a impressão
- **Pedidos envolvidos**: para fichas de produção em lote (ex: imprimiu 50 fichas), grava nos 50 pedidos de uma vez via `.in('id', ids)` + update individual em paralelo
- **Backward compat**: pedidos antigos sem `impressoes` são tratados como `[]` (sem ícone, sem coluna na detalhes)

## Arquivos a editar/criar

- **Migration** — `ALTER TABLE orders ADD COLUMN impressoes jsonb NOT NULL DEFAULT '[]'::jsonb`
- **Criar** `src/lib/printHistory.ts` — função `registerOrderPrints`
- `src/contexts/AuthContext.tsx` — adicionar `impressoes` no tipo `Order`
- `src/lib/order-logic.ts` — mapear nos dois sentidos
- `src/lib/pdfGenerators.ts` — chamar `registerOrderPrints` antes de `doc.save` em `generateProductionSheetPDF` e `generateReportPDF`
- `src/components/SpecializedReports.tsx` — chamar nas 12 funções de export
- `src/components/SoladoBoard.tsx` e `src/pages/PiecesReportPage.tsx` — idem
- `src/components/OrderCard.tsx` — ícone `Printer` condicional + tooltip
- `src/pages/OrderDetailPage.tsx` — terceira coluna "Histórico de Impressão"

## O que NÃO mexo

- Lógica de geração dos PDFs em si — só adiciono uma chamada antes do `save`
- Layout dos PDFs — sem alteração
- Histórico de produção e alterações existentes — sem alteração
- Numeração de páginas (já implementada) — continua funcionando

## Validação (você faz depois)

1. Imprimir uma Ficha de Produção com 3 pedidos selecionados → abrir cada um, conferir aba "Histórico de Impressão" com seu nome, data e hora
2. Voltar à lista → conferir ícone 🖨️ nos 3 pedidos com contador "1"
3. Imprimir o mesmo pedido outra vez → contador vai pra "2", lista mostra 2 entradas
4. Imprimir um Relatório de Corte → conferir que aparece como tipo "Relatório de Corte" no histórico

