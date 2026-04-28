# Chat Interno com IA para admin_master

Assistente de IA exclusivo para admin_master, sempre acessível via painel lateral, sem nunca ocupar a tela inteira.

## Comportamento da interface

- **Botão flutuante (FAB)** discreto no canto inferior direito, visível em **todas as páginas** do portal (exceto login), apenas para `admin_master`.
- Ao clicar, abre um **painel lateral à direita** (drawer) ocupando ~400px de largura no desktop. O resto do portal continua visível e **totalmente clicável/navegável** atrás.
- No mobile, o painel ocupa ~85% da largura mas ainda permite fechar e voltar à navegação.
- O painel **persiste entre páginas**: você pode trocar de rota (ir pra Relatórios, abrir um pedido, ir pro Financeiro) e a conversa continua aberta no mesmo lugar, sem perder o histórico.
- Botões no topo do painel: minimizar (volta ao FAB), nova conversa, abrir histórico de conversas anteriores.
- **Sem rota `/admin/assistente` em tela cheia** — o assistente vive 100% como overlay lateral.

## Funcionalidades

- Chat com streaming token a token, render em markdown.
- IA com conhecimento do sistema 7Estrivos via system prompt rico (regras de negócio, estrutura de banco, roles, fluxo de produção, regras de saldo/comissão).
- **Tools de consulta ao banco** (somente leitura): consultar pedido, listar pedidos, consultar vendedor, consultar saldo de revendedor, consultar estatísticas, consultar notificações de alerta, consultar logs recentes de edge functions.
- **Botão "Reportar problema desta página"** dentro do painel: pré-preenche a mensagem com a rota atual + últimos erros do console, pra você só completar com o que viu.
- Histórico de conversas persistido por usuário.

## Restrições importantes

- A IA **só consulta e sugere** — nunca apaga, edita ou modifica dados. Toda ação continua manual.
- Acesso liberado por **role `admin_master`** (qualquer admin_master, hoje só Juliana). Cada admin_master vê só as próprias conversas (RLS).
- Modelo padrão: `google/gemini-3-flash-preview` (rápido, dentro do $1 grátis mensal de AI). Seletor opcional pra `gpt-5` em casos complexos.

## Custos

- Zero créditos Lovable (chat não consome créditos de build).
- Centavos do saldo grátis de AI por mês de uso normal.

---

## Detalhes técnicos

**Backend (Supabase):**
- Migração: tabelas `admin_chat_conversations` (id, user_id, titulo, created_at, updated_at) e `admin_chat_messages` (id, conversation_id, role, content, created_at) com RLS exigindo `has_role(auth.uid(), 'admin_master')`.
- Edge function `admin-assistant`:
  - Valida JWT com `getClaims()` e checa `admin_master` via `has_role`.
  - Recebe histórico da conversa, faz streaming SSE para Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`).
  - Suporte a tool calling com as tools listadas acima (cada uma traduz pra query parametrizada via service role).
  - Trata 429 (rate limit) e 402 (sem saldo) retornando erro amigável.

**Frontend:**
- `src/components/admin/AdminAssistantFab.tsx` — botão flutuante + drawer lateral, montado no `App.tsx` (dentro do `AuthProvider`, fora do `Routes`) pra persistir entre rotas.
- `src/components/admin/AdminAssistantPanel.tsx` — UI do chat (lista de mensagens, input, streaming).
- `src/components/admin/AssistantMessage.tsx` — render markdown via `react-markdown`.
- `src/hooks/useAdminAssistant.ts` — gerencia estado da conversa, streaming SSE, persistência no banco.
- Captura de erros do console: pequeno listener global em `main.tsx` que guarda os últimos N erros em memória pro botão "Reportar problema".

**Dependência nova:** `react-markdown`.

---

## O que NÃO será criado

- ~~Página `/admin/assistente` em tela cheia~~ (removido por sua preferência)
- ~~Link "ASSISTENTE" no Header~~ (substituído pelo FAB global)
