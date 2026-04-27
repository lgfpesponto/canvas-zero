## Aba "Gestão" — Usuários ao vivo no portal

Criar uma nova aba **Gestão** acessível somente para `admin_master` (Juliana / login `7estrivos`), exibindo em tempo real quem está com o portal aberto. Útil pra publicar/atualizar o sistema sem atrapalhar usuários ativos.

### Como vai funcionar

1. **Rastreamento de presença (heartbeat ao vivo)**
   - Usar **Supabase Realtime Presence** (não cria tabela, é em memória do servidor Realtime).
   - Um hook global `usePresenceTracker` é montado dentro do `AuthProvider` quando o usuário está logado.
   - Ele entra num canal único `portal-presence` e faz `track({ user_id, nome_completo, role, page, joined_at, last_seen })`.
   - Atualiza `page` e `last_seen` sempre que a rota muda (via `useLocation`) e a cada 30s (heartbeat).
   - Ao deslogar / fechar a aba, o Presence remove automaticamente o usuário (untrack + disconnect).

2. **Nova página `/admin/gestao`**
   - Acesso restrito: só renderiza pra `admin_master`; outros são redirecionados pra `/`.
   - Um segundo subscribe no mesmo canal `portal-presence` lê o estado completo via `channel.presenceState()` e escuta `sync`, `join`, `leave`.
   - Mostra:
     - **Contador grande**: "X usuários online agora".
     - **Tabela** com: Nome, Login, Função (badge colorido por role), Página atual (ex.: `/relatorios`), Há quanto tempo está conectado, Último heartbeat ("há 12s").
     - **Filtro** por role e busca por nome.
     - **Aviso amarelo** no topo se houver mais de 1 usuário ativo, com texto: "Evite publicar agora — há N pessoas usando o portal".
   - Botão **Atualizar** (refaz `presenceState`) e auto-refresh visual a cada 5s.

3. **Item de menu no Header**
   - Adicionar `{ label: 'GESTÃO', path: '/admin/gestao' }` ao `navItems` somente quando `role === 'admin_master'`.
   - Posicionado logo após "CONFIGURAÇÕES".

### Arquivos a criar / alterar

- **Criar** `src/hooks/usePresenceTracker.ts` — hook que faz `track`/`untrack` no canal `portal-presence`, atualiza ao mudar de rota, heartbeat de 30s.
- **Criar** `src/pages/GestaoPage.tsx` — página com a tabela ao vivo, filtros, contador e aviso de publicação.
- **Editar** `src/contexts/AuthContext.tsx` — chamar `usePresenceTracker()` quando `isLoggedIn` for true (ou mover pro `App.tsx` dentro do `AuthProvider`).
- **Editar** `src/App.tsx` — registrar a rota `<Route path="/admin/gestao" element={<GestaoPage />} />`.
- **Editar** `src/components/Header.tsx` — adicionar item "GESTÃO" no menu (desktop e mobile) só pra `admin_master`.

### Pontos técnicos

- **Sem mudanças no banco**: Supabase Realtime Presence é stateless e não precisa de tabela nem migration. Não afeta storage (500MB).
- **Privacidade**: o canal só publica `nome_completo`, `role` e `page` — sem dados sensíveis. Como qualquer autenticado pode entrar no canal, a leitura da lista fica restrita pela UI da página `/admin/gestao` (gate por role no front). Se quiser bloquear leitura no servidor, dá pra evoluir depois com um canal privado + edge function — começamos com a versão simples.
- **Heartbeat**: 30s + dedupe automático do Presence (chave única por `user_id`); se a aba fechar sem aviso, o Realtime remove em ~30-60s.
- **Visual**: segue o padrão Apple-like minimal já usado em `AdminConfigPage` (Cards, Badges, lowercase no título).

### Resultado

Juliana abre **GESTÃO** no menu e vê em tempo real quem está logado, em qual tela, há quanto tempo — podendo decidir com segurança o melhor momento pra publicar uma atualização.
