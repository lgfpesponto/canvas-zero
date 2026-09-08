# Edição de pedido pelo vendedor e ficha sempre na versão atual

## 1. Ficha sempre na versão atual ao editar

Hoje, ao abrir um pedido antigo para edição, os campos e preços vêm da versão da ficha em que o pedido foi criado. Passará a usar sempre a ficha atual:

- A tela de edição da bota deixa de consultar o "retrato" da versão antiga e passa a ler a ficha vigente (campos, variações e valores de hoje).
- Ao salvar, o pedido passa a ficar marcado com a versão atual da ficha, para que o detalhe e a composição fiquem coerentes com o que foi editado.
- Nenhum pedido é alterado sozinho: a mudança só vale quando alguém abre e salva o pedido.

## 2. Vendedores podem editar enquanto o pedido está "Em aberto"

Vale para `vendedor` e `vendedor_comissao` (Fabiana, Gabriela, Larissa, Rafael, Samuel, Denise, Site), nos três tipos: bota, cinto e extras.

- O lápis de "editar pedido" no detalhe aparece para o vendedor dono do pedido somente quando o progresso é **Em aberto**.
- Assim que o pedido sai de "Em aberto" (Impresso, Produzindo, Conferido, Cobrado, Pago etc.), o botão some e as telas de edição bloqueiam o acesso com a mensagem de restrição.
- O vendedor edita a especificação do pedido (tamanho, modelo, couros, bordados, observação, foto, etc.). Continuam exclusivos do administrador: **preço/desconto** e a **troca de vendedor**. O valor é recalculado automaticamente pela ficha, como já acontece.

## 3. Justificativa obrigatória

- Ao salvar, o vendedor passa pelo mesmo diálogo de justificativa dos administradores, e o motivo fica registrado no histórico de alterações do pedido junto com o nome de quem editou.

## Detalhes técnicos

- `src/hooks/useEditWithJustification.ts`: exigir justificativa também para `vendedor` e `vendedor_comissao` (na prática, exigir para todos os papéis que podem editar).
- `src/pages/OrderDetailPage.tsx`: substituir a condição `isAdmin` do botão de editar por `podeEditar = isAdmin || (isVendedorDono && order.status === 'Em aberto')`.
- `src/pages/EditOrderPage.tsx`, `src/pages/EditBeltPage.tsx`, `src/pages/EditExtrasPage.tsx`: trocar o guard `if (!isAdmin) return <Acesso restrito>` pela mesma regra; manter campos de vendedor e de preço/desconto renderizados só quando `isAdmin`, e no payload não enviar `preco`/`desconto` alterados manualmente por vendedor (o total recalculado pela ficha continua).
- `src/pages/EditOrderPage.tsx`: usar `useFichaVariacoesLookup` (ficha atual) no lugar de `useFichaPriceForOrder(order)`, e incluir `fichaVersaoId` da versão ativa no payload de salvamento.
- Banco: ajustar a policy de UPDATE `Users can update own orders` para `auth.uid() = user_id AND status = 'Em aberto'` (com `WITH CHECK` equivalente), preservando as policies de admin, bordado e montagem.
