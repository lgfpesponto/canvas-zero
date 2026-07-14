## Objetivo
Permitir que o admin_master publique **comunicados gerais** (sem contagem regressiva), com data/hora de expiração, exibidos como banner azul informativo em todas as telas.

## Mudanças

### 1. Banco (`system_announcements`)
Adicionar coluna `expires_at TIMESTAMPTZ NULL`. A tabela já tem `tipo` (default `'deploy'`) — reutilizada com `tipo='comunicado'`.

- `deploy` → usa `scheduled_at` (data do deploy, com contagem regressiva)
- `comunicado` → usa `scheduled_at` como início da exibição e `expires_at` como fim (sem contagem)

### 2. Admin — `DeployAnnouncementCard.tsx` (aba Gestão)
Reorganizar o card em **duas abas internas** (ou dois blocos):

- **Aviso de deploy** — comportamento atual (mantido intacto)
- **Comunicado geral** — novo bloco com:
  - Campo mensagem (obrigatório, até 500 chars)
  - Data/hora de **expiração** (datetime-local)
  - Botões publicar / atualizar / remover
  - Carrega o comunicado ativo mais recente (`tipo='comunicado'`, `ativo=true`, `expires_at > now()`)

### 3. Banner — novo `ComunicadoBanner.tsx`
Componente separado do `DeployNoticeBanner`, renderizado no mesmo lugar (logo abaixo dele). Características:

- Busca `tipo='comunicado'`, `ativo=true`, `expires_at > now()`, ordenado por `created_at desc` (mostra apenas 1).
- **Estilo azul informativo**: `bg-blue-500 text-white`, ícone `Info`.
- **Sem contagem regressiva**, sem "faltam X min".
- **Dispensável por sessão** (mesmo mecanismo do deploy: `sessionStorage` com chave `comunicado_dismissed` + `id::updated_at`).
- Realtime na tabela + refetch a cada 60s para expirar sozinho.
- Se `expires_at <= now()` → some automaticamente.

### 4. Montagem no layout
Onde `DeployNoticeBanner` é renderizado hoje, adicionar `<ComunicadoBanner />` logo abaixo. Ambos podem coexistir (deploy amarelo + comunicado azul empilhados).

## Detalhes técnicos

**Migração:**
```sql
ALTER TABLE public.system_announcements
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL;
```
Sem novas policies/grants (tabela já configurada). Sem trigger de validação: a UI garante `expires_at > now()`.

**Filtro do banner comunicado:**
```ts
.eq('tipo', 'comunicado')
.eq('ativo', true)
.gt('expires_at', new Date().toISOString())
.order('created_at', { ascending: false })
.limit(1)
```

**Dispensa por sessão:** chave `sessionStorage['comunicado_dismissed'] = '${id}::${updated_at}'`. Se o admin editar o comunicado, `updated_at` muda e o banner reaparece para quem já dispensou.

## Fora do escopo
- Múltiplos comunicados simultâneos (mantém 1 ativo)
- Histórico de comunicados passados
- Dispensa permanente por usuário