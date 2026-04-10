

## Plano: Módulo de Configurações Administrativas

### Contexto

Hoje, todas as variações (modelos, couros, bordados, solados, etc.) e suas regras de preço estão hardcoded em `src/lib/orderFieldsConfig.ts` (~429 linhas). Este módulo vai migrar essa configuração para o banco de dados, permitindo gestão dinâmica via interface admin.

---

### 1. Migração de Banco de Dados (5 tabelas)

```sql
-- Tipos de ficha (bota, cinto, extra)
CREATE TABLE ficha_tipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  nome text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Categorias de campo por tipo de ficha
CREATE TABLE ficha_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_tipo_id uuid REFERENCES ficha_tipos(id) ON DELETE CASCADE NOT NULL,
  slug text NOT NULL,
  nome text NOT NULL,
  ordem int DEFAULT 0,
  ativo boolean DEFAULT true,
  UNIQUE(ficha_tipo_id, slug)
);

-- Variações dentro de cada categoria
CREATE TABLE ficha_variacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid REFERENCES ficha_categorias(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  preco_adicional numeric DEFAULT 0,
  ativo boolean DEFAULT true,
  ordem int DEFAULT 0
);

-- Etapas de produção (as 22 etapas)
CREATE TABLE status_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  nome text NOT NULL,
  ordem int DEFAULT 0
);

-- Workflow: quais etapas cada ficha percorre
CREATE TABLE ficha_workflow (
  ficha_tipo_id uuid REFERENCES ficha_tipos(id) ON DELETE CASCADE NOT NULL,
  etapa_id uuid REFERENCES status_etapas(id) ON DELETE CASCADE NOT NULL,
  ativo boolean DEFAULT true,
  PRIMARY KEY (ficha_tipo_id, etapa_id)
);
```

**RLS**: Todas as tabelas terão SELECT para `authenticated` e INSERT/UPDATE/DELETE restritos a `is_any_admin(auth.uid())`.

**Seed data**: Inserir os dados iniciais baseados no `orderFieldsConfig.ts` atual (modelos, couros, bordados, solados, etc.) e as 22 etapas de produção existentes no sistema.

---

### 2. Arquivos Novos

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/AdminConfigPage.tsx` | Página principal `/admin/configuracoes` com cards dos tipos de ficha |
| `src/pages/AdminConfigFichaPage.tsx` | Detalhe de um tipo (`/admin/configuracoes/:slug`) com categorias + checklist de etapas |
| `src/pages/AdminConfigVariacoesPage.tsx` | Gerenciamento de variações de uma categoria (`/admin/configuracoes/:slug/:categoriaId`) com tabela editável e entrada em massa |
| `src/hooks/useAdminConfig.ts` | Hooks React Query para CRUD das 5 tabelas |

---

### 3. Interface

**Página Principal** (`/admin/configuracoes`):
- Cards animados (framer-motion) para Bota, Cinto, Extra
- Cada card mostra nome, total de categorias e total de etapas ativas
- Guarda de rota: redireciona se role !== `admin_master` e !== `admin_producao`

**Edição de Ficha** (`/admin/configuracoes/:slug`):
- Seção "Categorias de Campo": lista de cards (Couros, Bordados, Solados, etc.) clicáveis
- Seção "Etapas de Produção": checklist com as 22 etapas, switch para ativar/desativar por ficha
- Botão para adicionar nova categoria

**Gerenciamento de Variações** (`/admin/configuracoes/:slug/:categoriaId`):
- Tabela editável inline: Nome, Preço Adicional, Ativo (switch)
- Botão "Entrada em Massa" abre um Dialog com textarea
- Formato aceito: `Nome | Preço` (uma por linha)
- Parsing automático, preview antes de confirmar, upsert em massa via Supabase

---

### 4. Regras de Estabilidade

- **Imutabilidade de pedidos**: O formulário de pedido já salva valores diretamente nos campos do pedido (ex: `preco`, `couro_cano`, etc.). Alterações nas tabelas de configuração afetam apenas pedidos futuros. Nenhuma mudança nos pedidos existentes.
- O `orderFieldsConfig.ts` atual continuará funcionando como fallback; a migração gradual dos formulários para ler do banco será uma etapa futura separada.

---

### 5. Estética e UX

- Fontes Montserrat/DM Sans conforme padrão do projeto
- Cores da marca (primary orange, card backgrounds)
- Ícones Lucide (Settings, Layers, CheckCircle, Plus, Upload)
- Transições com framer-motion (fadeIn, layout animations)
- Responsivo mobile-first

---

### 6. Rotas (App.tsx)

Adicionar 3 novas rotas:
```
/admin/configuracoes
/admin/configuracoes/:slug
/admin/configuracoes/:slug/:categoriaId
```

---

### Detalhes Técnicos

- Migration SQL com seed dos dados atuais do `orderFieldsConfig.ts`
- RLS em todas as 5 tabelas (admin-only para escrita)
- React Query com invalidação automática após mutações
- Upsert em massa via `supabase.from('ficha_variacoes').upsert([...])`
- Parsing do textarea: split por `\n`, cada linha split por `|`, trim, validação de preço numérico

