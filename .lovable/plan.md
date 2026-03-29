

## 1. Permitir editar vendedor (ADM) + 2. Bloquear número duplicado

### Alterações

#### 1. `src/pages/EditOrderPage.tsx` — Vendedor editável para ADM

**Linhas 338-342**: Substituir o `<input readOnly>` do vendedor por um `<select>` condicional:
- Se `isAdmin`: mostrar `<select>` com `allProfiles` + opção "Estoque", com state `vendedor` inicializado com `order.vendedor`
- Se não admin: manter input readOnly
- Adicionar state `vendedor` e incluir no `handleSave`: `vendedor` no payload do `updateOrder`

#### 2. `src/contexts/AuthContext.tsx` — updateOrder: atualizar user_id ao mudar vendedor

**Função `updateOrder` (linhas 665-756)**: Quando `data.vendedor` for diferente do `current.vendedor`:
- Buscar o profile do novo vendedor via `supabase.from('profiles').select('id').eq('nome_completo', data.vendedor)`
- Se vendedor = "Estoque", manter o user_id do admin atual
- Atualizar `dbUpdate.user_id` com o id do novo vendedor
- Adicionar `vendedor` ao `camelToSnake` map (já existe como `vendedor: 'vendedor'` implicitamente, mas `user_id` precisa ser incluído)
- Adicionar `'vendedor'` ao `fieldLabels` para tracking de alterações

#### 3. Validação de número duplicado — `addOrder` em `AuthContext.tsx`

**Função `addOrder` (linha 604-606)**: Após gerar o `numero`, antes do insert:
- Consultar `supabase.from('orders').select('id').eq('numero', numero).maybeSingle()`
- Se existir, mostrar `toast.error('Número de pedido já cadastrado no sistema. Por favor, utilize outro número.')` e retornar `false`

#### 4. Validação de número duplicado nos formulários (proteção extra)

Adicionar verificação antes do submit em:
- **`src/pages/OrderPage.tsx`** (confirmOrder): antes de chamar `addOrder`, verificar duplicata
- **`src/pages/BeltOrderPage.tsx`** (confirmOrder): mesma verificação
- **`src/pages/ExtrasPage.tsx`** (handleSubmit): mesma verificação

A verificação será feita dentro do `addOrder` no AuthContext (ponto central), cobrindo todos os fluxos automaticamente. Não precisa duplicar nos formulários.

#### 5. Validação de número duplicado na edição

**`src/pages/EditOrderPage.tsx`** e **`src/pages/EditExtrasPage.tsx`**: No `handleSave`, se o número mudou (`numeroPedido !== order.numero`), verificar duplicata antes de salvar. Query: `supabase.from('orders').select('id').eq('numero', newNumero).neq('id', order.id).maybeSingle()`.

### Resumo das alterações por arquivo

| Arquivo | Alteração |
|---------|-----------|
| `AuthContext.tsx` | addOrder: checar duplicata. updateOrder: atualizar user_id ao mudar vendedor. Adicionar vendedor ao fieldLabels |
| `EditOrderPage.tsx` | State vendedor + select para ADM + incluir vendedor no handleSave + checar duplicata se número mudou |
| `EditExtrasPage.tsx` | Checar duplicata se número mudou |

