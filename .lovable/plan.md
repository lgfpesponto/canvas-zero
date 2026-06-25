# Plano — Atalho Em Aberto→Baixa Estoque com justificativa + Edição/Exclusão de Estoque

## 1. Etapa direta para "Baixa Estoque" com justificativa

**Regra**: qualquer pedido pode ir direto para "Baixa Estoque" a partir de qualquer etapa, **mas se a transição não estiver na ordem padrão de produção** (ou seja, `FLOW[current]` não inclui `next`), pedir justificativa. Se já estiver na ordem padrão, manter sem justificativa.

### Arquivos

- `src/lib/statusTransitions.ts`
  - Permitir `Baixa Estoque` como destino independentemente do vendedor (remover o filtro `if (t === 'Baixa Estoque') return ctx.vendedor === 'Estoque'` em `applyContextFilter`). Mas continuar válido apenas no fluxo BOTA/CINTO (não nos extras, que já o têm).
  - Exportar uma helper `isDirectFlowNext(current, next, ctx): boolean` que checa se `pickFlow(ctx)[current]?.includes(next)`.

- `src/lib/statusRegression.ts`
  - Estender `requiresJustification`: quando `next === 'Baixa Estoque'` e `!isDirectFlowNext(current, next, ctx)` → retornar `'regression'` (reaproveita o modal existente com motivo). Caso direto no fluxo (Baixa Montagem/Expedição → Baixa Estoque) continua sem justificativa.
  - Generalizar opcionalmente para qualquer "salto" fora do fluxo padrão, mas no escopo desta tarefa cobrir apenas o caso `Baixa Estoque` para evitar quebrar fluxos existentes.

- Consumidor já existente em `ReportsPage.tsx` (linha ~469) — sem mudança, pois já usa `requiresJustification` e abre `JustificativaDialog`.

### Observação operacional
- Após a baixa direta, se o pedido tinha vendedor ≠ Estoque e o admin quiser efetivamente "criar produto" no estoque, ele ainda passa pelo `EstoqueAdminPanel` (precisa SKU+Nome). Para vendedor ≠ Estoque normalmente é o caso de "saiu fisicamente para o estoque": a etapa fica `Baixa Estoque` no histórico, e o admin pode ou não criar o produto correspondente.

## 2. Admin: excluir produto do estoque

Botão **"Excluir produto"** no card de cada produto em `EstoquePage` (visível apenas para admins — `useAuth().user.role` em `admin_master` ou `admin_producao`).

- Confirmação simples (`window.confirm` + texto explicativo) — exclui **todas as linhas** desse produto (mesmo nome + mesma raiz de sku_base).
- Implementação: `DELETE FROM estoque_produtos WHERE id IN (...)` direto (RLS já libera para `is_any_admin`).
- Apenas o produto é apagado — o pedido original e seu histórico continuam intactos.

## 3. Admin: editar grade (qtd, adicionar/remover tamanhos)

Novo botão **"Editar grade"** no card (admins). Abre dialog `EstoqueGradeEditor`:

- Lista todas as linhas `estoque_produtos` desse produto (mesmo `nome` + raiz de `sku_base`), inclusive `quantidade = 0`.
- Para cada tamanho:
  - Input numérico de quantidade (0 permitido).
  - Botão "Remover tamanho" → marca para `DELETE`.
- Linha "Adicionar tamanho": input de tamanho + input de quantidade + botão "+". SKU final = `${sku_base_root}-${tamanho}`. Detecta colisão no banco (`uq_estoque_produtos_sku_tam`).
- Botão "Salvar":
  - `UPDATE` quantidade nas linhas alteradas.
  - `INSERT` novos tamanhos (`preco`, `nome`, `foto_url`, `ficha_snapshot`, `sku_base` herdados da primeira linha do grupo).
  - `DELETE` linhas marcadas para remoção.
  - Tudo via cliente Supabase (RLS admin write).
- Realtime já existente em `EstoquePage` (canal `estoque-produtos-rt`) atualiza a UI.

### Arquivos novos / alterados

- `src/components/estoque/EstoqueGradeEditor.tsx` — novo dialog.
- `src/pages/EstoquePage.tsx` — botões "Editar grade" e "Excluir produto" no card (condicionados a admin), estado `editingProduct`/handlers, importa o novo dialog. Passar `id`s e `sku_base_root` para o editor.

## 4. Sem migração de banco

Não é necessário. RLS atual em `estoque_produtos` (`is_any_admin`) já cobre INSERT/UPDATE/DELETE direto pelo cliente. `criar_estoque_produto` continua igual.

## 5. Fora do escopo

- Não alterar o gating do botão "Criar estoque" no `EstoqueAdminPanel` (só aparece quando `status === 'Baixa Estoque'`) — segue funcional para pedidos de vendedor Estoque ou qualquer pedido que tenha SKU+Nome preenchidos.
- Sem novo modelo de auditoria específica para exclusão — `audit_orders` cobre o pedido; exclusão de produto de estoque é operação administrativa direta.

Confirma para implementar?
