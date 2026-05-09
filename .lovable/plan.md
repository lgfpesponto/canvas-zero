## Objetivo

Liberar para **todos os vendedores** (não só Stefany) uma página simplificada chamada **"Comprovantes"**, onde eles podem:
1. Enviar comprovante (com leitura automática pela IA, igual no admin master);
2. Ver a lista dos comprovantes que enviaram (status pendente / aprovado / reprovado);
3. Receber **notificação no sino** quando o admin master aprovar ou reprovar.

Nada de cálculo de saldo/utilizado/disponível para o vendedor por enquanto — só layout de envio + lista. O fluxo do admin master (aprovar/reprovar/baixa automática) **continua igual**.

## Mudanças de frontend

### 1. Acesso (`src/hooks/useFinanceiroSaldoAccess.ts`)
- Trocar `canSeeRevendedorView` para liberar para **qualquer usuário logado que seja vendedor** (roles: `vendedor`, `vendedor_comissao`), independente da tabela `revendedor_visibilidade`.
- Manter a tabela `revendedor_visibilidade` viva (admin ainda usa para outras telas), mas o hook não depende mais dela.
- Renomear semântica: `canSeeRevendedorView` → `canSeeComprovantesView` (mantendo retro-compat se preciso).

### 2. Header (`src/components/Header.tsx`)
- Trocar item de menu **"MEU SALDO"** por **"COMPROVANTES"**, mesmo path `/financeiro/saldo` (não muda rota pra não quebrar links).

### 3. Página (`src/pages/RevendedorSaldoPage.tsx`)
Reescrever pra versão enxuta:
- Título: **"Comprovantes"** (não "Meu Saldo").
- Remover totalmente os cards de **Total enviado / Já utilizado / Saldo disponível / A pagar**.
- Remover o alerta "Faltam pedidos para dar baixa".
- Remover chamadas a `fetchSaldoVendedor`, `fetchPedidosCobrados`, `fetchBaixasVendedor` e o canal realtime de `revendedor_saldo_movimentos`.
- Manter:
  - Botão **"Enviar comprovante"** (abre `EnviarComprovanteDialog` já existente);
  - Tabela **"Meus comprovantes enviados"** com data, valor, status, observação/motivo, anexo;
  - Realtime apenas em `revendedor_comprovantes` filtrado por `vendedor=eq.${vendedorName}`.

### 4. Dialog de envio (`EnviarComprovanteDialog.tsx`)
- Já recebe `vendedor` por prop e usa `extract-comprovante` (mesma IA do admin). **Sem mudanças.** O "campo automático de acordo com login" já é o `vendedorName` que vem do hook.

### 5. Sino (`src/hooks/useNotificacoes.ts` + `NotificacoesBell.tsx`)
- Adicionar leitura/realtime de uma nova fonte de notificações de comprovantes para o vendedor logado (ver mudanças de banco abaixo). Mesclar com as notificações de pedido existentes (mesma lista do sino).

## Mudanças de banco (migration)

### Trigger de notificação ao aprovar/reprovar comprovante
Como `order_notificacoes` exige `order_id NOT NULL` e é específica de pedidos, criar tabela nova **`comprovante_notificacoes`**:

- Colunas: `id`, `comprovante_id` (FK), `vendedor`, `tipo` (`aprovado` | `reprovado`), `descricao`, `lida`, `lida_em`, `created_at`.
- RLS: vendedor lê/atualiza só as próprias (`vendedor = profiles.nome_completo` do `auth.uid()`); admin_master full.
- Trigger `AFTER UPDATE` em `revendedor_comprovantes`: quando `status` muda de `pendente` → `aprovado` ou `reprovado`, inserir uma linha na nova tabela (descrição inclui valor + data + motivo se reprovado).
- RPC `marcar_comprovante_notificacao_lida(_id uuid)` e `marcar_todas_comprovante_notificacoes_lidas()`.

### Hook do sino
- `useNotificacoes` consulta as duas tabelas e devolve uma lista unificada (com campo `tipo` interno: `pedido` ou `comprovante`). Contagem de não lidas soma as duas.
- Clique numa notificação de comprovante: leva para `/financeiro/saldo`.

## O que NÃO muda
- Fluxo do admin master (FinanceiroPage / `ComprovantesRevendedorPendentes` / `FinanceiroSaldoRevendedor`): intocado.
- Edge function `extract-comprovante`: intocada (mesma IA pros vendedores).
- Lógica de baixa automática quando o admin aprova: intocada.
- Tabela `revendedor_visibilidade`: mantida (usada em outros lugares pro admin).

## Detalhes técnicos

### `useFinanceiroSaldoAccess` (novo critério)
```ts
const isVendedor = role === 'vendedor' || role === 'vendedor_comissao';
const canSeeComprovantesView = isLoggedIn && !!vendedorName && isVendedor;
```

### Roteamento
- `/financeiro/saldo` mantido (mesmo arquivo, novo conteúdo).
- Guard: `isAdminMaster || canSeeComprovantesView`.

### Migration (resumo)
```text
CREATE TABLE public.comprovante_notificacoes (...);
ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
-- policies (vendedor vê as suas, admin_master vê todas)
CREATE FUNCTION public.notify_comprovante_status_change() ...;
CREATE TRIGGER trg_comprovante_notif AFTER UPDATE ON revendedor_comprovantes ...;
CREATE FUNCTION public.marcar_comprovante_notificacao_lida(_id uuid) ...;
CREATE FUNCTION public.marcar_todas_comprovante_notificacoes_lidas() ...;
```

## Memória
Ao final, atualizar `mem://features/financeiro/saldo-revendedor` para refletir que **todos os vendedores** veem a aba "Comprovantes" (somente envio + lista, sem cálculo de saldo) e adicionar `mem://features/notificacoes/comprovante-status` documentando o trigger de aprovação/reprovação.
