## Objetivo

Adicionar um checkbox **"Conferido"** dentro da página de detalhe do pedido, visível e operável **apenas para `admin_master`**. Quando marcado, o pedido passa a exibir uma **tag "Conferido"** nas listagens — tag também só visível para `admin_master`.

## Mudanças

### 1. Banco — nova coluna em `orders` (migração)

Adicionar:
- `conferido boolean NOT NULL DEFAULT false`
- `conferido_em timestamptz NULL`
- `conferido_por uuid NULL` (id do admin que conferiu, para auditoria)

As policies atuais já permitem `admin_master` atualizar (`Admins can update all orders`), então não precisa nova RLS.

### 2. Tipos / mapeamento

**`src/contexts/AuthContext.tsx`** — adicionar `conferido?: boolean`, `conferidoEm?: string`, `conferidoPor?: string` no tipo `Order`.

**`src/lib/order-logic.ts`** — em `dbRowToOrder` mapear `conferido`, `conferido_em`, `conferido_por` para os campos camelCase.

### 3. Detalhe do pedido — checkbox

**`src/pages/OrderDetailPage.tsx`**

Renderizar, **somente quando `role === 'admin_master'`**, um bloco no topo do card de informações com:

```tsx
{role === 'admin_master' && (
  <label className="flex items-center gap-2 cursor-pointer select-none">
    <Checkbox
      checked={!!order.conferido}
      onCheckedChange={async (v) => {
        const novo = !!v;
        await supabase.from('orders').update({
          conferido: novo,
          conferido_em: novo ? new Date().toISOString() : null,
          conferido_por: novo ? user?.id : null,
        }).eq('id', order.id);
        await refetchOrder();
        toast.success(novo ? 'Pedido marcado como conferido' : 'Marcação removida');
      }}
    />
    <span className="text-sm font-bold">
      Conferido
      {order.conferido && order.conferidoEm && (
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          em {formatBrasiliaDate(order.conferidoEm)} {formatBrasiliaTime(order.conferidoEm)}
        </span>
      )}
    </span>
  </label>
)}
```

A escrita vai direto na tabela `orders` (não passa por `updateOrder`/`alteracoes`) — o objetivo é não poluir o histórico de alterações com cliques de conferência.

### 4. Tag "Conferido" nas listagens — só admin_master

**`src/components/OrderCard.tsx`** (usado em `ReportsPage` — listagem principal)

- Aceitar nova prop opcional `showConferidoTag?: boolean`.
- Quando `showConferidoTag && order.conferido`, renderizar um badge ao lado do número do pedido:

```tsx
{showConferidoTag && order.conferido && (
  <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold inline-flex items-center gap-1">
    <CheckCircle2 size={10} /> CONFERIDO
  </span>
)}
```

**`src/pages/ReportsPage.tsx`** — passar `showConferidoTag={role === 'admin_master'}` ao renderizar `<OrderCard>`.

**`src/pages/TrackOrderPage.tsx`** — listagem "Acompanhe seus Pedidos" também recebe a tag, condicional a `role === 'admin_master'` (vendedores normais nem veem).

### 5. (Opcional, mas recomendado) Permitir filtrar/ordenar por conferido

Não está no pedido — fica de fora. Se quiser depois, dá pra adicionar um filtro "Não conferidos" no `ReportsPage`.

## Resumo do comportamento

| Papel | Vê checkbox no detalhe | Pode marcar | Vê tag na listagem |
|---|---|---|---|
| admin_master | ✅ | ✅ | ✅ |
| admin_producao / vendedor / vendedor_comissao | ❌ | ❌ | ❌ |

## Notas

- A marcação **não gera entrada no histórico de alterações** (decisão para evitar ruído — confirme se prefere registrar).
- Coluna `conferido_por` fica para auditoria futura, sem UI agora.
- Sem migração de dados — todos pedidos antigos começam com `conferido = false`.