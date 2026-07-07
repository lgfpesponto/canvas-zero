## Reformular "Solicitar ajuste de preço" (comentário para o admin)

Mudança de semântica: o vendedor passa a pedir **o valor de desconto** (não o valor final). O admin master apenas dá **OK** (visualização), sem alterar o preço automaticamente.

### 1. Migration (DB)
- `order_ajuste_solicitacoes`:
  - Adicionar coluna `desconto_solicitado numeric` (nulo em linhas antigas).
  - Atualizar `CHECK (status IN (...))` para aceitar novo valor `'visto'`.
- Substituir a RPC `criar_ajuste_solicitacao(_order_id, _desconto, _motivo)`:
  - Aceita qualquer status do pedido (remove restrição a "Entregue").
  - Bloqueia se `orders.erro_de_pedido_id IS NOT NULL` ("Pedido de erro não permite ajuste").
  - Insere com `status='pendente'`, gravando `desconto_solicitado` (`valor_solicitado` fica 0/legado).
  - Impede segunda solicitação enquanto houver outra `pendente`.
- Ajustar policy de INSERT: remover exigência `o.status = 'Entregue'`, adicionar `o.erro_de_pedido_id IS NULL`.
- Nova RPC `marcar_ajuste_visto(_id)`:
  - Só `admin_master`.
  - Atualiza `status='visto'`, `decidido_por/decidido_em`.
  - Insere notificação no sino via `order_notificacoes` para o vendedor ("Admin visualizou sua solicitação de ajuste no pedido X").
  - **Não** mexe em `orders.preco` nem em `alteracoes`.
- Manter `decidir_ajuste_solicitacao` intocada (fluxo antigo continua funcional caso ainda seja chamada) — não usaremos mais no front.

### 2. `src/components/AjusteValorSolicitacao.tsx`
- Renderiza para o vendedor dono do pedido **em qualquer status**, exceto se `order.erroDePedidoId` estiver preenchido.
- Formulário do dialog:
  - Remover campo "Valor atual".
  - Único input: **"Valor do desconto desejado (R$)"**.
  - Campo Motivo (obrigatório).
- Estados visuais (renderiza como "comentário" inline, não como botão flutuante):
  - **Sem solicitação**: linha discreta com botão `Solicitar ajuste de preço`.
  - **Pendente**: badge amarelo "Solicitação de desconto: R$ X — {motivo} · aguardando admin".
  - **Visto**: badge verde "Solicitação vista pelo admin — desconto de R$ X — {motivo}".
- Remover ramos de "aprovado/negado/solicitar novamente".

### 3. `src/pages/OrderDetailPage.tsx`
- Mover `<AjusteValorSolicitacao/>` para dentro do bloco Composição do Pedido, posicionado **abaixo do Total e acima da Observação de Entrega**.
- Passar `hasErro={!!order.erroDePedidoId}` (ou tratar dentro do componente lendo do próprio order — passar o campo).
- Remover o local antigo do componente (linha ~894).
- Mostrar o comentário também para admin_master/vendedores na mesma posição (não só para o owner ver — admin master enxerga o comentário e o botão OK).

### 4. Admin master — botão OK
- Novo pequeno painel dentro do componente `AjusteValorSolicitacao` visível quando `role === 'admin_master'` e existe solicitação pendente: botão **OK** que chama `marcar_ajuste_visto`. Após clique, o próprio componente muda para o estado verde.
- `src/pages/SolicitacoesAjustePage.tsx`: substituir colunas "Valor atual / solicitado" por **Desconto solicitado**; substituir botões Aprovar/Negar por único **OK** que também chama `marcar_ajuste_visto`. Filtros passam de "aprovado/negado" para "visto".

### 5. PDFs
- `src/components/SpecializedReports.tsx` (Expedição) e `src/lib/cobrancaPdf.ts` (Cobrança): no builder da coluna "Composição", incluir uma linha `Solicitação de ajuste: R$ X — {motivo}` quando existir solicitação (pendente **ou** visto) no pedido. Buscar via join simples já feito nesses geradores (ou consulta batch em `order_ajuste_solicitacoes` pelas ordens filtradas).

### 6. Notificação no sino
- Gerada pela nova RPC `marcar_ajuste_visto` inserindo em `order_notificacoes` (mesmo canal já observado por `useNotificacoes`) — sem mudanças no front do sino.

### Fora de escopo
- Aplicar automaticamente o desconto ao pedido (feature explicitamente removida: "não precisa aprovar e fazer nada automático").
- Histórico do fluxo antigo aprovado/negado (mantém dados, apenas some do front).
- Editar/cancelar solicitação pelo vendedor após enviada.
