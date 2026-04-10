

## Plano: Reestruturação do Módulo de Configurações Administrativas

### Contexto
Já existe uma implementação básica com 3 páginas (AdminConfigPage, AdminConfigFichaPage, AdminConfigVariacoesPage) e 5 tabelas no Supabase. O pedido agora expande significativamente o escopo: abas internas, criador de fichas dinâmicas estilo Google Forms, e integração com o fluxo de pedidos.

---

### 1. Schema de Banco (nova tabela)

Para suportar fichas dinâmicas com campos configuráveis, é necessária uma nova tabela:

```sql
CREATE TABLE public.ficha_campos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_tipo_id uuid REFERENCES public.ficha_tipos(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  slug text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('texto', 'selecao', 'multipla', 'checkbox')),
  obrigatorio boolean DEFAULT false,
  ordem int DEFAULT 0,
  opcoes jsonb DEFAULT '[]',        -- para selecao/multipla: [{label, preco_adicional}]
  vinculo text,                      -- ex: 'preco', 'numeracao' para lógicas especiais
  desc_condicional boolean DEFAULT false, -- checkbox com campo de descrição
  ativo boolean DEFAULT true,
  UNIQUE(ficha_tipo_id, slug)
);
```

RLS: SELECT para authenticated, INSERT/UPDATE/DELETE restrito a `is_any_admin(auth.uid())`.

Também adicionar colunas em `ficha_tipos`:
```sql
ALTER TABLE public.ficha_tipos 
  ADD COLUMN tipo_ficha text DEFAULT 'classica',  -- 'classica' | 'dinamica'
  ADD COLUMN campos_nativos boolean DEFAULT true;  -- inclui numero, vendedor, qtd, preco
```

---

### 2. Reestruturação da Página Principal

**Arquivo**: `src/pages/AdminConfigPage.tsx` (reescrever)

Transformar em página com abas usando `Tabs` do Radix:
- **ficha de produção** (default): lista fichas com editar/apagar + botão "criar nova ficha"
- **extras**: placeholder (implementação futura)
- **progresso de produção**: lista das 22 etapas com edição de nome/ordem
- **relatórios**: placeholder (implementação futura)

---

### 3. Aba "Ficha de Produção"

- Listar fichas (bota, cinto, extra) como cards com botões "editar" e "apagar"
- Editar: navega para `/admin/configuracoes/:slug` (já existente, será aprimorado)
- Apagar: confirmação + soft delete (marcar ativo=false)
- Botão "criar nova ficha" abre o criador

---

### 4. Criador de Fichas (Estilo Google Forms)

**Novo componente**: `src/components/admin/FichaBuilder.tsx`

Interface em dialog/página com:
1. Nome da ficha (input)
2. Lista de campos dinâmicos com botão "adicionar campo"
3. Cada campo tem:
   - Nome do campo
   - Tipo: Texto Aberto, Seleção Única, Múltipla Escolha, Checkbox Sim/Não
   - Toggle "obrigatório"
   - Se checkbox: toggle "campo de descrição condicional"
   - Se seleção/múltipla: textarea para opções (Nome | Preço, uma por linha)
   - Vínculo opcional: dropdown com opções (preço, numeração, nenhum)
4. Campos nativos automáticos (número do pedido, vendedor, quantidade, preço) - mostrados como chips não-editáveis
5. Botão "criar ficha": insere em ficha_tipos + ficha_campos + workflow padrão

Ao criar, a ficha aparece automaticamente no menu "faça seu pedido" através de leitura dinâmica da tabela `ficha_tipos`.

---

### 5. Renderizador Dinâmico de Fichas

**Novo componente**: `src/pages/DynamicOrderPage.tsx`

- Rota: `/pedido-dinamico/:slug`
- Lê `ficha_campos` do banco e renderiza o formulário dinamicamente
- Campos nativos (número, vendedor, quantidade, preço) sempre presentes
- Salva pedido na tabela `orders` com `tipo_extra = slug` e `extra_detalhes = {campo1: valor1, ...}`
- Snapshot de preços no momento da criação (imutabilidade)

---

### 6. Integração com Header/Menu

**Arquivo**: `src/components/Header.tsx`

Adicionar fichas dinâmicas ativas ao menu "FAÇA SEU PEDIDO" como dropdown, ou adicionar novas rotas automaticamente.

**Arquivo**: `src/pages/Index.tsx`

Cards de "faça seu pedido" lidos dinamicamente do banco (fichas ativas).

---

### 7. Integração com "Meus Pedidos"

Os pedidos de fichas dinâmicas já serão salvos na tabela `orders` com `tipo_extra`, logo já aparecem em "meus pedidos" seguindo as regras de RLS existentes. O `OrderCard` e `OrderDetailPage` precisam de ajustes menores para exibir o nome da ficha e os detalhes do `extra_detalhes`.

---

### 8. Arquivos Envolvidos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Nova tabela `ficha_campos` + alterações em `ficha_tipos` |
| `src/pages/AdminConfigPage.tsx` | Reescrever com abas |
| `src/pages/AdminConfigFichaPage.tsx` | Aprimorar com edição de nome da ficha |
| `src/components/admin/FichaBuilder.tsx` | Novo - criador estilo Google Forms |
| `src/pages/DynamicOrderPage.tsx` | Novo - renderizador de fichas dinâmicas |
| `src/hooks/useAdminConfig.ts` | Adicionar hooks para ficha_campos |
| `src/App.tsx` | Adicionar rota `/pedido-dinamico/:slug` |
| `src/components/Header.tsx` | Menu dinâmico com fichas ativas |
| `src/components/OrderCard.tsx` | Suporte a nome dinâmico da ficha |
| `src/pages/OrderDetailPage.tsx` | Renderizar extra_detalhes de fichas dinâmicas |

---

### 9. Restrições

- Fichas clássicas (bota, cinto) mantêm seus formulários atuais como fallback
- `orderFieldsConfig.ts` permanece ativo para botas/cintos
- Apenas fichas "dinâmicas" usam o novo renderizador
- Alterações de preço/variação nunca afetam pedidos existentes (snapshot via `extra_detalhes`)
- Acesso restrito a `admin_master` e `admin_producao`
- Estética: caixa baixa, Montserrat/DM Sans, Lucide, framer-motion

