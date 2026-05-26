## Confirmação: comprovantes da Denise

Soma dos 7 comprovantes aprovados = **R$ 19.110,00** (1.745 + 2.778,30 + 938 + 2.228,70 + 2.990 + 5.015 + 3.415). O card está correto: Recebido 19.110 − Utilizado 16.475 = **Saldo R$ 2.635,00**. Nenhum ajuste necessário; o número que parecia "errado" bate certinho.

---

## 1. Bloquear movimentação manual para "Pago" / "Cobrado"

- Remover/ocultar a opção "Pago" (e "Cobrado") do seletor de mudança de etapa no detalhe do pedido e na ação em massa, para **todos** os usuários (inclusive admin_master).
- Mudança para "Cobrado" passa a ocorrer **apenas** via fluxo do PDF de cobrança (item 3 abaixo).
- Mudança para "Pago" passa a ocorrer **apenas** via aprovação de comprovante / baixa automática de saldo (fluxo já existente).
- Adicionar guard no backend (RPC ou trigger) que recusa UPDATE direto de `orders.status` para "Pago"/"Cobrado" quando feito fora desses fluxos (usando uma flag de sessão/contexto setada pelos fluxos legítimos).

## 2. Solicitação de ajuste de valor pelo vendedor

**Banco**
Nova tabela `order_ajuste_solicitacoes`:
- `order_id`, `vendedor`, `numero`, `valor_atual`, `valor_solicitado`, `motivo`, `status` (pendente / aprovado / negado), `decidido_por`, `decidido_em`, `resposta_admin`, `created_at`.
- RLS: vendedor insere/lê só as suas (somente para pedidos onde `vendedor = current_user_nome_completo()` e status do pedido = `Entregue`); admin_master lê todas e UPDATE para aprovar/negar.
- Trigger: ao aprovar, aplica o novo valor no pedido (atualiza `preco` ou `desconto` conforme escolhido) e registra no `historico` + `alteracoes`. Ao negar, só registra resposta.
- Notificação: notifica vendedor no sino quando aprovado/negado (extensão do padrão já usado para comprovantes).

**Frontend vendedor**
- No detalhe do pedido (e no card da listagem), quando `status = Entregue` e não houver solicitação pendente, mostrar botão **"Solicitar ajuste de valor"**.
- Dialog com: valor atual (readonly), novo valor desejado, motivo obrigatório, botão enviar.
- Se já existe solicitação pendente, mostrar badge "Ajuste solicitado — aguardando admin".

**Frontend admin_master**
- Novo card no Dashboard: **"Solicitações de ajuste (N)"** com link para nova aba `/admin/solicitacoes-ajuste`.
- Aba lista todas as solicitações (pendentes/decididas) com colunas: data, vendedor, nº pedido, cliente, valor atual, valor pedido, motivo, ações **Aprovar** / **Negar** (com campo de resposta opcional).
- Filtro por status e busca por número/vendedor.

## 3. Sugestão pós-cobrança em "Conferidos"

- Em `SpecializedReports.tsx`, no fluxo de geração de PDF de cobrança a partir dos pedidos **Conferidos**, após o PDF ser gerado com sucesso abrir **dialog automático**:
  - Texto: "PDF de cobrança gerado com X pedidos. Deseja marcar todos esses pedidos como **Cobrado**?"
  - Lista expandível com nº/vendedor/valor dos pedidos incluídos.
  - Botões: **Sim, marcar como Cobrado** / **Não, manter como está**.
- Ao confirmar, faz UPDATE em massa dos `order_ids` do snapshot do PDF para `status = 'Cobrado'`, registrando no histórico cada pedido ("Marcado como Cobrado via PDF #{nome_arquivo}"). Esse fluxo passa a flag legítima que o guard do item 1 reconhece.
- Dispara para vendedores afetados notificação no sino (padrão Sino Vendedor já existente).

---

## Detalhes técnicos

- Tabelas novas: `order_ajuste_solicitacoes` (migration).
- Trigger SECURITY DEFINER `aplicar_ajuste_solicitacao()` aplicando preço/desconto + histórico ao mudar status para "aprovado".
- Função/contexto para identificar UPDATE legítimo de status para Cobrado/Pago (ex.: `set_config('app.allow_status_cobrado','1', true)` antes do UPDATE no fluxo do PDF, lido pelo trigger guard).
- Componentes novos: `SolicitarAjusteDialog.tsx`, `SolicitacoesAjusteAdmin.tsx` (página + card no Dashboard), `CobrancaMarcarComoCobradoDialog.tsx`.
- Ajustes em: `OrderDetail` (botão vendedor + esconder Pago/Cobrado no seletor), action em massa de etapa, `SpecializedReports.tsx` (dialog pós-PDF), `AdminDashboard.tsx` (card de pendências).
