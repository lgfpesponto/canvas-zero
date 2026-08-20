# Voltar o "Gerar Grade" para os vendedores

## O que aconteceu

O bloco de Tamanho com a opção de grade hoje só é montado quando quem está preenchendo é admin com o vendedor "Estoque" ou "Juliana Cristina Ribeiro". Para o vendedor comum a tela cai no campo de Tamanho simples, sem o botão. A lógica de salvar em grade continua intacta e já prevê o vendedor comum — o que sumiu foi só o botão na tela.

## O que fazer

1. Mostrar de novo, acima do campo Tamanho, as duas opções para o vendedor comum: escolher um tamanho **ou** clicar em "Gerar Grade" — exatamente como era antes.
2. Depois de definir a grade, o campo mostra o resumo ("X tam. / Y pedidos") e permite editar, igual ao vendedor Estoque.
3. Ao finalizar, usa o mesmo mecanismo de grade do vendedor Estoque: um pedido para cada par, numerado a partir do número base do pedido (base + tamanho + sequência), todos com a mesma ficha.
4. Diferenças mantidas para o vendedor comum: sem exigência de SKU e sem tamanhos com quantidade zero (isso continua exclusivo do fluxo de estoque).
5. Navegação por Enter: ao chegar em Tamanho o vendedor continua abrindo a lista de tamanhos (o Enter não abre o gerador de grade); o botão fica disponível para clique.

## Verificação

- Entrar como vendedor comum, abrir "Faça seu Pedido": o botão "Gerar Grade" aparece acima/ao lado do rótulo Tamanho.
- Gerar uma grade com dois tamanhos e finalizar: conferir em Meus Pedidos que saiu um pedido por par, numerados a partir do número base.
- Passar pela ficha só com Enter: em Tamanho abre a lista de tamanhos normalmente.

## Detalhes técnicos

- `src/pages/OrderPage.tsx` (~linha 2376): a condição do bloco de Tamanho/Grade passa a incluir `isVendedorComum`, mantendo o `SelectField` padrão apenas para os demais papéis (bordado/montagem/admin com outros vendedores).
- `GradeEstoque` já recebe `requireSku`/`allowQtdZero` condicionados a `vendedorSelecionado === 'Estoque'`, então o vendedor comum entra sem SKU obrigatório e sem quantidade zero.
- `confirmOrder` e `addOrderBatch` já tratam `isGradeVendedor` incluindo vendedor comum — nenhuma mudança de lógica de salvamento é necessária.
