## Restringir edição a admin_master + lápis para produtos extras

### 1. Modo edição da ficha exclusivo do admin_master

Em `src/contexts/FichaEditContext.tsx`:
- Trocar `isAdmin = role === 'admin_master' || 'admin_producao'` por **apenas `admin_master`**.
- Efeito colateral: `admin_producao` deixa de ver o toggle "modo edição" na bota/cinto — mantém tudo funcionando para admin_master.

Também no `FichaEditToggle` (verificar se ele reusa `isAdmin` do contexto — se sim, nada a fazer).

### 2. Lápis de edição nos cards de produtos extras (`/extras`)

Adicionar controle inline visível **só para admin_master** em cada card de `EXTRA_PRODUCTS`, com um popover no mesmo estilo do `FichaFieldControls`:

Campos editáveis no popover:
- **Nome** (`nome`) — texto livre.
- **Preço base** (`precoBase`) — número; quando `null` mantém rótulo "Variável" e desabilita input.
- **Rótulo de preço** (`precoLabel`) — texto livre (ex.: "R$ 15,00", "A partir de R$ 30,00").
- **Variações do produto** (quando existem — ver seção 3): lista editável com nome + preço + botão "adicionar variação" + excluir, idêntica ao `EditPopover` da ficha.
- **Botão "excluir produto"** no rodapé (destructive) — abre `<AlertDialog>` com o texto: *"Excluir o produto X remove-o do banco e da lista. Pedidos antigos permanecem intactos. Confirmar?"*. Só apaga do banco após confirmação.

### 3. Persistência dos extras no banco

Hoje `EXTRA_PRODUCTS` é uma constante hardcoded em `src/lib/extrasConfig.ts`. Para permitir editar/excluir precisamos de fonte de verdade no banco.

**Migração (nova tabela `extra_produtos`)**:
```sql
CREATE TABLE public.extra_produtos (
  id text PRIMARY KEY,               -- mesmo id do EXTRA_PRODUCTS (tiras_laterais…)
  nome text NOT NULL,
  descricao text,
  preco_base numeric,                -- null = "Variável"
  preco_label text NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.extra_produtos TO anon, authenticated;
GRANT ALL ON public.extra_produtos TO service_role, authenticated;  -- admin_master edita via UI
ALTER TABLE public.extra_produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "todos leem" ON public.extra_produtos FOR SELECT USING (true);
CREATE POLICY "só admin_master escreve" ON public.extra_produtos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));
-- trigger updated_at (usa update_updated_at_column existente)
```
Seed: `INSERT` de todos os 17 itens de `EXTRA_PRODUCTS` com `ordem` sequencial. Idempotente via `ON CONFLICT (id) DO NOTHING`.

**Nova pasta/lógica no frontend**:
- Hook `useExtraProdutos()` em `src/hooks/useExtraProdutos.ts` — SELECT ordenado por `ordem`, filtrado por `ativo=true`.
- `ExtrasPage` passa a mapear os cards e modals sobre `useExtraProdutos()` em vez de `EXTRA_PRODUCTS`. **A constante `EXTRA_PRODUCTS` continua exportada** e é usada como fallback para `PRODUCT_FIELDS`, `calcPrice`, `renderForm` (que dependem de `productId` fixo) — nada muda na lógica de pedido.
- `openModal`, `handleSubmit` etc. seguem usando `product.id` (o mesmo string), então cálculos e rótulos internos permanecem íntegros.

### 4. Variações dos produtos extras

Reusar o mesmo mecanismo de `ficha_tipos` para os produtos que hoje têm listas hardcoded:

| Produto | Variações a semear (campo → constantes atuais) |
|---|---|
| gravata_country / gravata_pronta_entrega | Cor da tira ← `GRAVATA_COR_TIRA`; Tipo de metal ← `GRAVATA_TIPO_METAL`; Cor do brilho ← `COR_BRILHO_GRAVATA` |
| adicionar_metais | Itens ← `[Bola grande R$0,60, Strass R$0,60]` (checkbox unitário) |
| palmilha | Formato do bico ← `PALMILHA_FORMATO_BICO`; Tamanho ← `TAMANHOS` |
| carimbo_fogo | Faixas ← `[1–3 carimbos R$20, 4+ R$40]` |
| revitalizador / kit_revitalizador | Tipo (livre — sem seed) |
| demais (bainha, chaveiro, kit_faca, kit_canivete) | Reusam `TIPOS_COURO`/`CORES_COURO` da bota — sem seed próprio |

Migração cria um `ficha_tipos` "extras" (slug `extras`) contendo uma **categoria por produto extra** e um **campo por variação** semeado a partir das constantes acima. Preços = valores atuais → nenhum pedido antigo muda.

No modal do produto, envolver o conteúdo com `<FichaEditProvider fichaSlug="extras">` e acoplar `<FichaFieldControls>` em cada `<Label>` de campo variável, exatamente como já foi feito em `OrderPage` e `BeltOrderPage`.

`useDynamicFieldFilter` / `getDynamicUnitPrice` já sabem ler de `ficha_variacoes` — assim que houver override o extra passa a usar o preço do banco. Sem override, cai no fallback (constante atual).

### 5. Segurança / RBAC
- Ícone lápis nos cards só renderiza se `user?.role === 'admin_master'`.
- Backend: RLS na `extra_produtos` bloqueia qualquer role != admin_master.
- Toggle "modo edição" na bota/cinto: mesma regra.

### 6. Arquivos alterados

- `src/contexts/FichaEditContext.tsx` — restringir `isAdmin`.
- `src/lib/extrasConfig.ts` — mantém constantes (fallback).
- `src/hooks/useExtraProdutos.ts` — **novo** (query + mutations `upsert`/`delete`).
- `src/pages/ExtrasPage.tsx` — cards e modals a partir do hook; render de lápis + AlertDialog de exclusão; envolver conteúdo do modal com `FichaEditProvider` para expor os `FichaFieldControls`.
- `src/components/extras/ExtraProdutoEditPopover.tsx` — **novo**, análogo ao `EditPopover` da ficha (nome, preço, label, excluir).
- Migração Supabase: `extra_produtos` + seed dos 17 registros + `ficha_tipos` "extras" com categorias/campos/variações a partir das constantes atuais.

### Notas de compatibilidade
- Nenhuma alteração em `PRODUCT_FIELDS`, `calcPrice`, `renderForm`, RPC `decrement_stock`.
- Excluir um extra do banco apenas o remove da listagem — pedidos existentes com aquele `tipoExtra` continuam válidos (o histórico usa o snapshot já salvo em `orders.modelo` e `extra_detalhes`).
- admin_producao perde acesso à edição inline em toda a plataforma (fichas + extras); permanece com acesso ao restante do painel admin.