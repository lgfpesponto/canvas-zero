## Adicionar status "Impresso" na produção

Novo status entre **Em aberto** e **Aguardando**, conta como em produção, e é aplicado **automaticamente** quando a admin de produção (Fernanda / `admin_producao`) clica em **IMPRIMIR FICHAS** na página de Relatórios.

### O que muda para o usuário

- Aparece um novo status **"Impresso"** na esteira de produção, logo após "Em aberto" e antes de "Aguardando".
- Pedidos com status "Impresso" passam a contar no card **"Produtos na produção"** do dashboard.
- Quando a Fernanda (admin_producao) imprimir as fichas pelo botão **IMPRIMIR FICHAS**, todos os pedidos selecionados que estiverem em **"Em aberto"** serão promovidos automaticamente para **"Impresso"**.
  - Pedidos em qualquer outro status (Aguardando, Corte, etc.) **não** sofrem alteração.
  - Outros usuários (admin_master / vendedores) imprimem normalmente, **sem** mudar status.

### Mudanças técnicas

**1. Banco de dados (migration)**
- Inserir nova linha em `status_etapas`: `nome="Impresso"`, `slug="impresso"`, `ordem=2`; reordenar os demais (somar +1 a partir de "Aguardando").
- Atualizar a função `get_production_counts` para incluir `'Impresso'` no array de status considerados em produção.

**2. `src/lib/order-logic.ts`**
- Inserir `"Impresso"` em:
  - `PRODUCTION_STATUSES`
  - `PRODUCTION_STATUSES_USER`
  - `PRODUCTION_STATUSES_IN_PROD`
- Posição: imediatamente após `"Em aberto"`.

**3. `src/pages/ReportsPage.tsx`**
- No `handleGenerateProductionSheetPDF`:
  - Gerar o PDF normalmente.
  - Se o usuário atual tiver role `admin_producao`, percorrer `ordersToExport` e, para cada pedido com `status === 'Em aberto'`, chamar `updateOrder(id, { status: 'Impresso' })` (ou update direto via supabase) registrando a alteração no histórico (mesmo padrão usado em outras mudanças de status).
  - Toast informando quantos pedidos foram movidos para "Impresso".

### Pontos fora do escopo
- Cor/badge específico do novo status segue o estilo padrão dos demais (sem CSS dedicado).
- Página de Detalhes do Pedido e tela de progresso já listam status dinamicamente a partir das constantes acima — não requer mudança extra.