## Objetivo
Adicionar uma seção **"Histórico de Impressão"** no detalhe do pedido (`OrderDetailPage`) que registra automaticamente toda vez que aquele pedido foi incluído num PDF gerado — seja Ficha de Produção individual ou qualquer relatório especializado em lote (Corte, Bordados, Forro, Pesponto, Forma, Palmilha, Metais, Escalação, Expedição, Cobrança, Extras/Cintos).

## 1. Banco de dados (migration)
Adicionar coluna **`impressoes jsonb NOT NULL DEFAULT '[]'`** na tabela `orders`.

Estrutura de cada entrada:
```json
{
  "tipo": "Ficha de Produção" | "Corte" | "Bordados" | "Forro" | ...,
  "data": "2026-04-26",
  "hora": "14:32",
  "usuario": "Juliana",
  "total_pedidos": 12   // 1 quando é ficha individual
}
```

Não precisa de RLS nova — herda a política existente de `orders` (admins podem update; vendedor pode update no próprio pedido). Como só admins geram PDFs/fichas, o `update` funcionará normalmente.

## 2. Helper centralizado — `src/lib/printHistory.ts` (novo)
Função `recordPrintHistory(orderIds: string[], tipo: string, userName: string)`:
- Faz um `select id, impressoes` em `orders` filtrando os `orderIds`
- Anexa a nova entrada (com `data`, `hora` em fuso Brasília, `usuario`, `total_pedidos = orderIds.length`) ao array
- Faz update em batch (um por pedido — Supabase não suporta update array diferente em massa numa só query, mas usamos `Promise.all`)
- Falha silenciosa (apenas `console.warn`) — nunca bloquear a geração do PDF

## 3. Integração nos geradores
Em **cada função** que termina com `doc.save(...)`, chamar `recordPrintHistory(...)` logo antes do save:

| Arquivo | Funções a instrumentar |
|---|---|
| `src/lib/pdfGenerators.ts` | `generateReportPDF`, `generateProductionSheetPDF`, `generateCommissionPDF` |
| `src/components/SpecializedReports.tsx` | `generateEscalacaoPDF`, `generateForroPDF`, `generatePalmilhaPDF`, `generateFormaPDF`, `generateNewPespontoPDF`, `generateMetaisPDF`, `generateBordadosPDF`, `generateCortePDF`, `generateExpedicaoPDF`, `generateCobrancaPDF`, `generateExtrasCintosPDF` |
| `src/pages/PiecesReportPage.tsx` | função de geração do PDF de peças |
| `src/components/SoladoBoard.tsx` | função de geração do PDF do quadro |
| `src/components/CommissionPanel.tsx` | já chama `generateCommissionPDF` (coberto via item 1) |

Para passar o `userName`, ler de `useAuth().user?.user_metadata?.nome_completo` ou do profile já carregado e propagar como argumento. Onde os geradores são funções puras em `pdfGenerators.ts`, adicionar parâmetro opcional `meta?: { userName: string }`.

## 4. UI no detalhe do pedido — `src/pages/OrderDetailPage.tsx`
Adicionar nova seção **abaixo de "Histórico de Alterações"**, com layout idêntico (mesmo card western-shadow, mesmo ícone `Printer` do `lucide-react`):

```
🖨 Histórico de Impressão
────────────────────────────
26/04/2026 às 14:32 — Ficha de Produção — Juliana
26/04/2026 às 15:10 — Corte (12 pedidos no lote) — Fernanda
25/04/2026 às 09:00 — Expedição (47 pedidos no lote) — Juliana
```

Quando `total_pedidos === 1` exibir só `Tipo`; quando `> 1` exibir `Tipo (N pedidos no lote)`.
Estado vazio: "Nenhuma impressão registrada."

Tipo TypeScript adicionado ao `Order` em `AuthContext` e mapping em `dbRowToOrder` (`order-logic.ts`):
```ts
impressoes: (row.impressoes as any[]) || [],
```

## 5. Refresh
Após gerar o PDF, fazer `refetchOrder()` em `OrderDetailPage` se a página ativa for o detalhe — caso contrário apenas persiste no banco e aparecerá na próxima visita.

## Arquivos editados
- **Migration**: nova coluna `impressoes` em `orders`
- **Novo**: `src/lib/printHistory.ts`
- **Edit**: `src/lib/pdfGenerators.ts` (3 funções)
- **Edit**: `src/components/SpecializedReports.tsx` (11 funções)
- **Edit**: `src/pages/PiecesReportPage.tsx`
- **Edit**: `src/components/SoladoBoard.tsx`
- **Edit**: `src/pages/OrderDetailPage.tsx` (nova seção UI)
- **Edit**: `src/lib/order-logic.ts` (`dbRowToOrder` lê `impressoes`)
- **Edit**: `src/contexts/AuthContext.tsx` (tipo `Order` ganha `impressoes?: any[]`)

## Pontos de atenção
- **Performance**: relatórios em lote com 100+ pedidos farão 100 updates paralelos. Aceitável (RLS rápida, jsonb pequeno), mas se ficar lento podemos criar uma RPC `append_print_history(ids uuid[], entry jsonb)` em iteração futura.
- **Fail-silent**: se o `update` falhar, o PDF já foi salvo no disco do usuário — apenas logar warning.
- **`types.ts` do Supabase** será regenerado automaticamente após a migration.
