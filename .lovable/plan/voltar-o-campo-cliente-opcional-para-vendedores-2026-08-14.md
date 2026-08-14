# Voltar o campo "Cliente" (opcional) para vendedores

Hoje, para o papel `vendedor` (e usuários sem papel), os campos "Cliente" e "WhatsApp do Cliente" ficam ocultos nas telas de compra/pedido.

## Mudança

- O campo **Cliente volta a aparecer para todos**, sempre como opcional para o vendedor comum (obrigatório apenas nos casos que já eram obrigatórios hoje, ex.: pedidos da Juliana).
- O campo **WhatsApp do Cliente continua oculto** para o vendedor comum (permanece visível para os demais papéis).

Telas afetadas:
- Faça seu pedido (bota) e pedido de cinto
- Página Modelos (modal de compra)
- Página Extras
- Compra de Estoque (modal)
- Pedido dinâmico (produtos extras/dinâmicos)

## Detalhes técnicos

Arquivos: `OrderPage.tsx`, `BeltOrderPage.tsx`, `ModelosPage.tsx`, `ExtrasPage.tsx`, `DynamicOrderPage.tsx`, `components/estoque/EstoqueBuyDialog.tsx`.

- Manter a flag `ocultarCliente` apenas para o bloco do WhatsApp (renomeada mentalmente como "ocultar contato"), e remover a condição do bloco Cliente.
- Nos arquivos onde Cliente e WhatsApp estão no mesmo fragmento condicional (Extras, EstoqueBuyDialog), separar em dois blocos: Cliente sempre renderizado, WhatsApp sob `!ocultarCliente`.
- Nenhuma alteração em validação/salvamento: `cliente` já é opcional no envio.
