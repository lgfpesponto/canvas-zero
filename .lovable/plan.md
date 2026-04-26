## Compartilhamento de modelos entre usuários

### Como vai funcionar (resumo)

1. Na lista "Modelos Salvos", cada modelo ganha um botão **"Enviar"** (ícone de avião).
2. Ao clicar, abre um diálogo com a lista de usuários (busca por nome) e checkboxes pra selecionar um ou vários destinatários.
3. Você confirma → o sistema **copia** o modelo pra cada destinatário escolhido (cópia independente — eles podem editar/excluir sem afetar o seu).
4. Quando o destinatário entra no sistema:
   - Aparece um **toast** "Você recebeu N novos modelos de [Fulano]"
   - O botão **"Modelos"** ganha um **badge vermelho** com o número de modelos não vistos
   - Ao abrir a lista de modelos, esses ficam marcados com um indicador "Novo" e somem do contador depois de visualizados

### Mudanças no banco

**1. Migration — adicionar colunas em `order_templates`:**
```sql
ALTER TABLE public.order_templates
  ADD COLUMN sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN sent_by_name text,
  ADD COLUMN seen boolean NOT NULL DEFAULT true;
-- modelos próprios = seen=true por padrão; modelos recebidos serão criados com seen=false
```

> Como já existe a regra de RLS `auth.uid() = user_id` em todos os comandos, a "transferência" funciona via INSERT do **remetente** definindo `user_id` = id do destinatário. Pra isso, a política de INSERT precisa ser ajustada:

**2. Migration — RLS de INSERT mais permissiva pra envio:**
```sql
DROP POLICY "Users can insert own templates" ON public.order_templates;
CREATE POLICY "Users can insert templates (own or sent)"
  ON public.order_templates FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id           -- modelo próprio
    OR auth.uid() = sent_by        -- ou sou o remetente registrando o envio
  );
```

Continua seguro: você só consegue inserir um modelo pra outra pessoa se marcar a si mesmo como `sent_by`. As políticas de SELECT/UPDATE/DELETE permanecem `auth.uid() = user_id` (só o dono vê/edita/apaga).

**Importante sobre exclusão**: a regra do projeto é "só `admin_master` pode apagar". Modelos sempre foram exceção (cada vendedor sempre apagou os próprios) — vou manter assim. Se quiser que recebidos não possam ser apagados pelo destinatário, me avise.

### Mudanças no frontend

**`src/hooks/useTemplateManagement.ts`**
- `TemplateRecord` ganha `sent_by_name?: string` e `seen: boolean`.
- Nova função `sendTemplateToUsers(templateId, recipientIds, senderName)` — copia `form_data` + `nome` pra cada destinatário com `seen=false` e `sent_by=auth.uid()`.
- Nova função `markTemplatesAsSeen(userId)` — UPDATE em massa pra zerar o badge depois que o usuário abre a lista.
- `loadTemplates` passa a trazer também `sent_by_name` e `seen`.

**`src/pages/OrderPage.tsx`**
- Botão **"Enviar"** (ícone `Send` da lucide) em cada linha do diálogo "Modelos Salvos".
- Novo `Dialog` interno: lista de usuários (consulta `profiles` ordenada por nome, busca + checkboxes), botão "Enviar para X usuários".
- Badge vermelho no botão "Modelos" mostrando contagem de `seen=false`.
- Ao abrir o diálogo de modelos, dispara `markTemplatesAsSeen` (fica visualmente marcado como "Novo" enquanto o diálogo está aberto, e zera o contador).
- Linhas de modelos recebidos exibem rótulo "Recebido de Fulano" abaixo do nome.

**`src/contexts/AuthContext.tsx`** (pequeno acréscimo)
- Após login bem-sucedido, faz uma consulta rápida `count` em `order_templates` com `seen=false` e mostra `toast.info` com a quantidade.

### O que NÃO mexo
- Outras tabelas, outras políticas RLS.
- Lógica de criação/edição/uso do modelo no formulário.
- Sistema de modelos do "Estoque" ou outros.
- Drafts (`src/lib/drafts.ts`).

### Validação (você faz depois)
1. Criar um modelo como Fulano → clicar "Enviar" → escolher Cicrano → confirmar.
2. Logar como Cicrano → ver toast "1 novo modelo recebido de Fulano" + badge no botão Modelos.
3. Abrir Modelos → ver o modelo na lista com rótulo "Recebido de Fulano" → badge zera.
4. Cicrano edita o modelo → confirmar que **não afeta** o original do Fulano.

### Observação importante
A coluna `sent_by` referencia `auth.users(id)` apenas via `ON DELETE SET NULL` (sem foreign key forte no schema público — Supabase aceita), pra que se o remetente for excluído no futuro, o modelo não suma. Vou armazenar **também** o nome em `sent_by_name` no momento do envio, garantindo que "Recebido de Fulano" continua aparecendo mesmo se o usuário deixar a empresa.