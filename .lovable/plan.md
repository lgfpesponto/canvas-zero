## Objetivo
Ocultar o campo "WhatsApp do Cliente" nas páginas "Faça seu Pedido" (Bota e Cinto) para todos, exceto:
- `vendedor_comissao`
- Juliana (`admin_master`)

## Mudanças
1. **`src/pages/OrderPage.tsx`**
   - Criar helper `podeVerWhatsapp = user?.role === 'vendedor_comissao' || user?.role === 'admin_master'`.
   - Envolver o bloco do label + input de WhatsApp (linhas ~1582-1587) em `{podeVerWhatsapp && (...)}`.
   - No submit (linha 1004), quando não puder ver, forçar `clienteWhatsapp: undefined` (já é o caso se estado ficar vazio; garantir que o estado inicial não venha preenchido de draft para quem não pode ver — filtrar no `useState` inicial).

2. **`src/pages/BeltOrderPage.tsx`**
   - Mesmo helper e mesmo `{podeVerWhatsapp && (...)}` no bloco (linha ~650).
   - Garantir envio `undefined` quando oculto.

## Fora de escopo
- `EditBeltPage`, `EditOrderPage`, `ExtrasPage`, `OrderDetailPage`: continuam mostrando/permitindo WhatsApp normalmente (usuário só pediu na tela "faça seu pedido" de bota e cinto).
- Nenhuma mudança em banco, schema, PDF, ou lógica de envio via `WhatsappShareButton`.
