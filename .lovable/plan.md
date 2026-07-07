## Ajustes no Dashboard do admin_master

1. **Card "Solicitações de ajuste de valor"** (`AdminDashboard.tsx`)
   - Remover a lista inline dos pedidos pendentes e os botões OK/X.
   - Manter apenas: ícone, título, contador ("N pedidos aguardando sua decisão") e o botão/link **"Ver página completa →"**.

2. **Seção "Pedidos de Alerta"**
   - Remover completamente do dashboard do admin_master.

## Correção da justificativa do vendedor no ajuste aprovado

Atualmente, ao aprovar via RPC `aprovar_ajuste_solicitacao`, o campo `desconto_justificativa` do pedido está sendo preenchido com o motivo digitado pelo admin (ou vazio), e o histórico não registra o motivo original enviado pelo vendedor.

Correções:

3. **RPC `aprovar_ajuste_solicitacao`** (migration)
   - Ao aprovar, gravar em `orders.desconto_justificativa` o `motivo` da própria `ajuste_valor_solicitacoes` (justificativa enviada pelo vendedor), não um texto vazio.
   - Registrar entrada no histórico de alterações do pedido (`order_history` / mecanismo atual) com:
     - Ação: "Ajuste de valor aprovado"
     - Autor: admin_master que aprovou
     - Detalhes: valor solicitado, tipo (desconto/acréscimo) e **motivo enviado pelo vendedor** literal.

4. **Notificação ao vendedor**
   - Continuar enviando notificação de aprovação, incluindo o motivo original para contexto.

## Fora de escopo
- Nenhuma alteração no fluxo da página `/solicitacoes-ajuste` (preview inline, OK/X permanecem lá).
- Nenhuma alteração nas notificações de recusa.
