# Comissão Rancho Chique — Coluna Cliente + Edição de data do pedido

Duas mudanças, ambas restritas ao vendedor **Rancho Chique** (Mariana):

## 1. Coluna "Cliente" no painel e PDF de comissão

**Onde:** `src/components/CommissionPanel.tsx` e `src/lib/pdfGenerators.ts` (`generateCommissionPDF`).

- Painel de comissão (tela): quando o vendedor logado é Rancho Chique, exibir lista resumida com Nº do pedido, Data e **Cliente** (campo `order.cliente` já existe na tabela `orders`).
- PDF: adicionar coluna **Cliente** entre "Nº do Pedido" e "Código de Barras" (ou ao lado da data — cabe melhor ali). Layout reajustado para A4 retrato, fonte 9 se necessário, com truncamento.
- Passar `cliente` no array enviado ao `generateCommissionPDF` (hoje só passa `id`, `numero`, `dataCriacao`).

## 2. Editar data do pedido (só Rancho Chique)

**Cenário:** ela fechou o mês dia 30, mas só conseguiu lançar pedidos dia 4. Precisa retroceder a data para o mês anterior e ele entrar na comissão correta.

**Onde habilitar a edição:**
- `src/pages/OrderDetailPage.tsx` — adicionar, próximo ao bloco de "Data do pedido", um botão **"Editar data"** visível apenas quando `order.vendedor === 'Rancho Chique'` E o usuário logado é admin_master OU o próprio Rancho Chique.
- Abre um popover com `Calendar` (shadcn datepicker) + campo de **justificativa obrigatória** (textarea).
- Ao salvar:
  - `UPDATE orders SET data_criacao = 'YYYY-MM-DD' WHERE id = ...`
  - Inserir entrada em `alteracoes` (JSONB já existente) com:
    ```json
    { "campo": "dataCriacao", "valorAntigo": "...", "valorNovo": "...",
      "justificativa": "...", "usuario": "...", "data": "ISO", "afetouValor": false }
    ```
  - Adicionar `'dataCriacao': 'Data do Pedido'` em `FIELD_LABELS` (`src/lib/order-logic.ts`) para aparecer formatado no histórico.

**Restrição dura:** validar no front (botão só aparece) — sem migration de RLS, pois admin_master e o próprio dono do pedido já podem dar `UPDATE` em `orders` pelas policies existentes.

## Fora de escopo

- Sem mudança no cálculo de comissão por mês (continua agrupando por `dataCriacao.startsWith('YYYY-MM')` — basta a Mariana editar a data dos pedidos atrasados).
- Sem mudança em outros vendedores.
- Sem migration de banco.

## Detalhes técnicos

Arquivos tocados:
- `src/components/CommissionPanel.tsx` — passa `cliente`, mostra coluna quando vendedor = Rancho Chique.
- `src/lib/pdfGenerators.ts` — coluna Cliente no PDF.
- `src/pages/OrderDetailPage.tsx` — botão + dialog de edição de data.
- `src/lib/order-logic.ts` — label `dataCriacao` em FIELD_LABELS.
