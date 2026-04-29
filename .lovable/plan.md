## Objetivo

Quando o usuário estiver dentro de um pedido (`/pedido/:id`) e clicar em "Voltar", deve sempre ir para a página **Meus Pedidos** (`/relatorios`), em vez de usar o histórico do navegador (`navigate(-1)`).

## Problema atual

Em `src/pages/OrderDetailPage.tsx` (linha 374), o botão "Voltar" usa `navigate(-1)`, que volta para a página anterior do histórico. Isso causa comportamento inconsistente:

- Se o usuário entrou no pedido via link direto / refresh / navegou pelas setas Anterior/Próximo várias vezes, o `-1` pode levar para qualquer lugar (até para fora do app).
- O usuário espera sempre cair em "Meus Pedidos".

## Mudança

Trocar `navigate(-1)` por `navigate('/relatorios')` no botão "Voltar" do header do `OrderDetailPage`.

```tsx
<button onClick={() => navigate('/relatorios')} ...>
  <ArrowLeft size={16} /> Voltar
</button>
```

## Arquivo afetado

- `src/pages/OrderDetailPage.tsx` — linha 374 (apenas o `onClick` do botão "Voltar").

## Fora do escopo

- Não altera as setas Anterior/Próximo.
- Não altera o checkbox "Conferido" nem outras funcionalidades.
- Não altera o "Voltar" de outras páginas (edição, extras, cinto) — se quiser o mesmo comportamento lá, é uma extensão separada.
