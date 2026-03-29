

## Sistema de Modelos para Ficha de Produção de Bota

### Resumo
Criar uma tabela `order_templates` no Supabase para armazenar modelos reutilizáveis de fichas de produção. Cada usuário só vê seus próprios modelos. Adicionar botões "Criar Modelo" e "Modelos" na página da ficha, e uma página/dialog para listar e usar modelos salvos.

### Alterações

#### 1. Nova tabela `order_templates` (migração SQL)
```sql
CREATE TABLE public.order_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.order_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates" ON public.order_templates
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own templates" ON public.order_templates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON public.order_templates
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON public.order_templates
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
```

O campo `form_data` armazena todos os campos da ficha (modelo, couros, bordados, etc.) como JSON — mesmo formato usado nos rascunhos (`Draft.form`).

#### 2. Modificar `src/pages/OrderPage.tsx`

**Título + botões** (linha 535):
- Trocar o `<h1>` simples por um flex container com título + botões "Criar Modelo" e "Modelos"

**Estado `mode`**:
- Novo state: `mode: 'order' | 'template'` (default `'order'`)
- Novo state: `templateName: string`
- Quando `mode === 'template'`:
  - Esconder campos: Vendedor, Número do Pedido, Tamanho, Gênero (cliente)
  - Mostrar campo "Nome do Modelo" no topo do form
  - Trocar botões do rodapé por único botão "CRIAR MODELO"
  - Ao salvar: inserir na tabela `order_templates` com `form_data` = todos os campos preenchidos

**Carregar modelo** (via `location.state.templateData`):
- Quando navegar de "Modelos" com `templateData`, preencher todos os states do form a partir dele (mesmo padrão do draft)
- Campos de vendedor/número/tamanho ficam vazios para preenchimento manual

**Dialog "Modelos"**:
- Botão "Modelos" abre um Dialog listando templates do usuário (query `order_templates` WHERE `user_id = auth.uid()`)
- Cada item mostra nome + botão "Preencher" + botão "Excluir"
- "Preencher" navega para `/pedido` com `state: { templateData: form_data }` e `productChoice: 'bota'`

#### 3. Detalhes técnicos

- Reutilizar o mesmo `Record<string, string>` do `handleSaveDraft` para montar o `form_data` do template
- Para carregar template: mesma lógica de restauração do draft (`df.campo || ''`)
- A RLS garante que cada usuário só vê seus próprios modelos
- Não é necessária edge function — operações CRUD diretas via Supabase client

