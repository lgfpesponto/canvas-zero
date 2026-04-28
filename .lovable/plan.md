## Aviso de Nova Versão (Deploy)

Permitir que a Juliana (admin_master), na aba **Gestão**, configure um aviso informando o **horário em que será publicada uma nova versão do sistema**. Esse aviso aparece como um **banner amarelo no topo de todas as páginas** para todos os usuários logados, pedindo que salvem o trabalho antes do horário.

---

## Como vai funcionar

### Para o admin_master (em `/admin/gestao`)
Novo card **"Aviso de Nova Versão"** com:
- Campo data + hora do deploy (ex: 28/04/2026 18:30)
- Mensagem opcional editável (com texto padrão pré-preenchido)
- Botões: **Publicar aviso** / **Atualizar** / **Remover aviso**
- Mostra status atual: ativo, agendado, ou nenhum

### Para todos os usuários logados
Banner amarelo fixo no topo (acima do Header, mesmo padrão do alerta de armazenamento atual):

> ⚠️ **Atenção:** Uma nova versão do sistema será publicada hoje às **18:30**. Salve seu trabalho até lá — pedidos não salvos podem ser perdidos. *(faltam 2h 15min)*

- Contagem regressiva atualiza sozinha
- Quando faltarem ≤ 15min, o banner fica **vermelho** e pulsa
- Após o horário passar (+30min de tolerância), o aviso **somem automaticamente** para não ficar poluindo
- Usuário pode **dispensar** o banner (fica oculto naquela aba via sessionStorage), mas reaparece se a Juliana atualizar o aviso

---

## Mudanças técnicas

### 1. Banco (migration)
Nova tabela `system_announcements`:
```
id, tipo ('deploy'), scheduled_at timestamptz, mensagem text,
ativo boolean, created_at, created_by, updated_at
```
- RLS: SELECT liberado para todos autenticados; INSERT/UPDATE/DELETE só `admin_master`
- Realtime habilitado para o banner atualizar instantaneamente em todas as abas abertas

### 2. Frontend
- **`src/pages/GestaoPage.tsx`** — adicionar card de configuração no topo (data/hora, mensagem, botões)
- **Novo `src/components/DeployNoticeBanner.tsx`** — busca o aviso ativo, escuta Realtime, renderiza banner com contagem regressiva, botão dispensar
- **`src/App.tsx`** — montar `<DeployNoticeBanner />` antes do `<Header />` para todos os usuários logados

### 3. Lógica
- Hook que faz query inicial + subscribe Realtime na tabela
- Banner só aparece se: `ativo = true` AND `scheduled_at` está entre **agora** e **agora + 24h** (ou até 30min depois do horário)
- Aviso antigo (passou +30min) fica no banco para histórico mas não exibe

---

## Resultado

A Juliana abre a aba Gestão, escolhe "hoje 18:30", clica Publicar. Imediatamente todos os usuários logados (incluindo os que já estão com o portal aberto) veem o banner no topo com o horário e contagem regressiva, sabendo que precisam salvar o trabalho.

Posso aplicar?