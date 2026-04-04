

## Reforçar regra de número de pedido único em todos os fluxos

### Situação atual

| Fluxo | Validação duplicata no submit | Validação em tempo real | Validação no rascunho |
|-------|------------------------------|------------------------|----------------------|
| Bota (OrderPage) | ✅ via `addOrder` | ❌ | ❌ |
| Cinto (BeltOrderPage) | ✅ via `addOrder` | ❌ | ❌ |
| Extras (ExtrasPage) | ✅ via `addOrder` | ❌ | ❌ |
| Grade Estoque (batch) | ✅ via `addOrderBatch` | ❌ | N/A |
| Edição (EditOrderPage) | ✅ | ❌ | N/A |
| Edição Extras | ✅ | ❌ | N/A |

A validação no submit já existe em todos os fluxos. O que falta: **validação em tempo real** (ao digitar) e **bloqueio de rascunhos duplicados**.

### Alterações

#### 1. Novo hook: `src/hooks/useCheckDuplicateOrder.ts`

Hook reutilizável com debounce (500ms) que consulta o Supabase ao digitar o número do pedido:

```ts
// Retorna { isDuplicate, checking }
// Consulta: supabase.from('orders').select('id').eq('numero', numero).maybeSingle()
// Aceita excludeId opcional (para edição)
```

#### 2. Mensagem de erro padronizada

Atualizar todas as mensagens para:
> "Este número de pedido já existe no sistema. Não é permitido criar pedidos com números duplicados. Por favor, utilize outro número de pedido."

#### 3. `src/pages/OrderPage.tsx` — Validação em tempo real + rascunho

- Usar `useCheckDuplicateOrder(numeroPedido)`
- Exibir alerta vermelho abaixo do campo "Nº do pedido" quando duplicado
- Bloquear botão "CONFERIR E FINALIZAR" se `isDuplicate`
- Bloquear botão "SALVAR RASCUNHO" se `isDuplicate`

#### 4. `src/pages/BeltOrderPage.tsx` — Mesma validação

- Usar `useCheckDuplicateOrder(numeroPedido)`
- Exibir alerta + bloquear botões submit e rascunho

#### 5. `src/pages/ExtrasPage.tsx` — Mesma validação

- Usar `useCheckDuplicateOrder(form.numeroPedidoBota)`
- Exibir alerta + bloquear botão de submit

#### 6. `src/pages/EditOrderPage.tsx` e `src/pages/EditExtrasPage.tsx`

- Usar `useCheckDuplicateOrder(numero, order.id)` (excluindo o próprio pedido)
- Exibir alerta + bloquear botão salvar

#### 7. `src/components/GradeEstoque.tsx`

- Na pré-visualização dos números gerados, verificar duplicatas em batch e marcar os que já existem

### Resultado

- Campo de número mostra erro em tempo real ao digitar número duplicado
- Botões de finalizar e rascunho ficam desabilitados enquanto número for duplicado
- Mensagem de erro clara e padronizada em todos os fluxos
- Validação dupla: tempo real + antes de salvar (segurança)

