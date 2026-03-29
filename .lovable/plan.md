

## Novo Produto "Gravata Pronta Entrega" com Controle de Estoque

### Resumo

Criar um novo produto extra com estoque gerenciado por admins. Requer uma nova tabela no Supabase para o estoque, novo produto no config, e UI especial no ExtrasPage com fluxo de compra por variação e painel de estoque para admins.

### 1. Nova tabela `gravata_stock` (migração SQL)

```sql
CREATE TABLE public.gravata_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cor_tira text NOT NULL,
  tipo_metal text NOT NULL,
  quantidade integer NOT NULL DEFAULT 0,
  UNIQUE (cor_tira, tipo_metal)
);
ALTER TABLE public.gravata_stock ENABLE ROW LEVEL SECURITY;
-- Todos autenticados podem ver o estoque
CREATE POLICY "Authenticated can view stock" ON public.gravata_stock FOR SELECT TO authenticated USING (true);
-- Apenas admins podem gerenciar
CREATE POLICY "Admins can insert stock" ON public.gravata_stock FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update stock" ON public.gravata_stock FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete stock" ON public.gravata_stock FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
```

### 2. `src/lib/extrasConfig.ts` — Novo produto + constantes

- Adicionar produto `gravata_pronta_entrega` ao `EXTRA_PRODUCTS`:
  ```ts
  { id: 'gravata_pronta_entrega', nome: 'Gravata Pronta Entrega', descricao: 'Gravata pronta com controle de estoque', precoBase: 30, precoLabel: 'R$ 30,00' }
  ```
- Exportar constantes reutilizáveis:
  ```ts
  export const GRAVATA_COR_TIRA = ['Preto', 'Marrom', 'Off White', 'Laranja'];
  export const GRAVATA_TIPO_METAL = ['Bota', 'Chapéu', 'Mula', 'Touro', 'Bridão Estrela', 'Bridão Flor', 'Cruz', 'Nossa Senhora'];
  ```
- Atualizar `EXTRA_PRODUCT_NAME_MAP` automaticamente (já é dinâmico)

### 3. `src/pages/ExtrasPage.tsx` — Fluxo de compra + painel de estoque

**Novos states:**
- `stockItems`: array de `{ id, cor_tira, tipo_metal, quantidade }` carregado do Supabase
- `selectedStockId`: variação selecionada para compra
- `showStockManager`: boolean para abrir painel de estoque (admin)
- `stockCorTira`, `stockTipoMetal`, `stockQtd`: campos do formulário de estoque

**Card do produto:** Adicionar botão "Organizar estoque" visível apenas para admins, abaixo do botão "Comprar".

**Fluxo de compra (renderForm para `gravata_pronta_entrega`):**
1. Campo "Número do pedido" (obrigatório) + campo "Cliente" (opcional)
2. Vendedor (admin only) — igual aos outros extras
3. Listar variações com estoque > 0: `Marrom + Touro (3 disponíveis)` — radio buttons
4. Botão "Finalizar Pedido" — cria o pedido com preço fixo R$30 e reduz 1 do estoque via `supabase.from('gravata_stock').update({ quantidade: item.quantidade - 1 }).eq('id', selectedStockId)`

**Painel "Organizar estoque" (Dialog separado, admin only):**
- Listar estoque atual (todas as variações com quantidade)
- Form: selecionar cor_tira + tipo_metal + quantidade → Salvar
- Ao salvar: upsert — se a combinação já existe, somar quantidade; senão, inserir nova linha
- Usar `supabase.rpc` ou fazer select + update/insert manualmente

**calcPrice:** Adicionar `case 'gravata_pronta_entrega': return 30;`

**PRODUCT_FIELDS:** Adicionar `gravata_pronta_entrega: ['corTira', 'tipoMetal']`

**handleSubmit para `gravata_pronta_entrega`:**
- Validar que uma variação foi selecionada
- Criar pedido normalmente via `addOrder`
- Decrementar estoque: update quantidade - 1

### 4. Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Tabela `gravata_stock` com RLS |
| `src/lib/extrasConfig.ts` | Novo produto, constantes de variações |
| `src/pages/ExtrasPage.tsx` | Fluxo de compra com estoque, painel admin |

