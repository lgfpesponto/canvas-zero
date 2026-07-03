## Objetivo

Permitir que vendedor e vendedor_comissao gerem grade de tamanhos ao passar um pedido de bota em "Faça seu Pedido", com o mesmo funcionamento do vendedor Estoque/Juliana (subpedidos gerados automaticamente), mas SEM tornar o campo Cliente obrigatório.

## Fluxo de UX (novo)

Para vendedor e vendedor_comissao, na seção "Modelo" do OrderPage:

- O campo Tamanho continua aparecendo normal (obrigatório) como hoje.
- Ao lado do label "Tamanho" aparece um mini botão "Gerar Grade" (ícone + texto pequeno).
- Ao clicar, abre o mesmo dialog `GradeEstoque` já existente.
- Depois de confirmar a grade, o campo Tamanho é substituído pelo resumo da grade (igual Juliana hoje: "X tam. (Y pedidos) — Editar"). Tamanho deixa de ser obrigatório.
- Enquanto não gerar grade, pedido segue o fluxo normal com Tamanho único.
- Cliente permanece opcional (sem asterisco, sem validação — diferente da Juliana).
- WhatsApp do Cliente continua aparecendo (opcional).
- Ao salvar com grade, usa `addOrderBatch` exatamente como já faz para Juliana (sem SKU obrigatório — `requireSku=false`).

Para admin (Estoque/Juliana): comportamento atual preservado 100%.

## Alterações técnicas (arquivo único: `src/pages/OrderPage.tsx`)

1. Novo flag derivado:
   - `const isVendedorComum = !isAdmin && (user?.role === 'vendedor' || user?.role === 'vendedor_comissao');`
   - `const podeGerarGrade = isAdmin && (Estoque || Juliana) || isVendedorComum;` (mantém `isGradeVendedor` atual, cria variante nova).
   - `const isEstoqueGrade` passa a considerar `podeGerarGrade && gradeItems.length > 0`.

2. Validação (linhas ~908-919):
   - Tamanho só é obrigatório quando `!isEstoqueGrade`.
   - Validação de Cliente obrigatório continua apenas para Juliana (não muda).

3. Submit (linhas ~1094-1099):
   - `if (isEstoqueGrade)` chama `addOrderBatch` — já cobre o novo caso via `podeGerarGrade`.

4. Render do campo Tamanho (linhas ~1546-1566):
   - Se `isAdmin && (Estoque||Juliana)`: mantém o card grande atual.
   - Se `isVendedorComum`:
     - Sem grade: renderiza `SelectField Tamanho` normal + mini botão "Gerar Grade" ao lado do label (via prop nova ou wrapper local com label customizado).
     - Com grade: mesmo card resumo "X tam. (Y pedidos) — Editar" usado hoje.

5. Dialog `<GradeEstoque>` (linhas ~1958+):
   - Continua o mesmo; `requireSku` fica `vendedorSelecionado === 'Estoque'` (falso para vendedor comum) e `nomeProduto` fica vazio para vendedor comum.

## Fora de escopo

- Nenhuma alteração em regras de comissão, preço, backend, RLS ou geração de PDF.
- Grade fica disponível apenas em Faça seu Pedido de Bota (OrderPage). Cinto/Extras não mudam.
- Vendedor Bordado e admin_producao não ganham grade.