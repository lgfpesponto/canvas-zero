

## Campo "Cliente" nos pedidos + busca nos rascunhos

### Resumo

Adicionar campo opcional "Cliente" nas fichas de bota, cinto e extras. O campo e visivel para revendedores e oculto para admins (exceto pedidos do vendedor "Rancho Chique"). Atualizar regra de rascunho e adicionar busca na pagina de rascunhos.

### Alteracoes

#### 1. Migracao SQL — adicionar coluna `cliente` na tabela `orders`

```sql
ALTER TABLE public.orders ADD COLUMN cliente text DEFAULT '' NOT NULL;
```

Coluna texto, default vazio, nao obrigatoria.

#### 2. `src/contexts/AuthContext.tsx`

- **Order interface** (linha 36): adicionar `cliente?: string`
- **dbRowToOrder** (linha 205): adicionar `cliente: row.cliente || ''`
- **orderToDbRow** (linha 288): adicionar `cliente: order.cliente || ''`

#### 3. `src/pages/OrderPage.tsx` — Ficha de Bota

- **State**: adicionar `const [cliente, setCliente] = useState(df.cliente || '')`
- **Campo no formulario** (apos "Numero do Pedido", ~linha 651): campo de texto opcional, escondido quando `mode === 'template'` (igual ao vendedor/numero)
- **mirrorRows**: adicionar `['Cliente', cliente]`
- **confirmOrder**: incluir `cliente` no payload do `addOrder`
- **handleSaveDraft**: incluir `cliente` no objeto `form`
- **Regra de rascunho**: validar que `numeroPedido.trim() || cliente.trim()` antes de salvar, senao mostrar erro
- **Restauracao de draft**: carregar `setCliente(df.cliente || '')`

#### 4. `src/pages/BeltOrderPage.tsx` — Ficha de Cinto

- **State**: adicionar `const [cliente, setCliente] = useState('')`
- **Campo no formulario** (apos "Numero do Pedido", ~linha 254): campo texto opcional
- **mirrorRows**: adicionar `['Cliente', cliente]`
- **confirmOrder**: incluir `cliente` no payload
- **handleSaveDraft**: incluir `cliente` no form
- **Regra de rascunho**: mesma validacao (numero ou cliente)
- **Restauracao de draft**: carregar `setCliente(f.cliente || '')`

#### 5. `src/pages/ExtrasPage.tsx` — Extras

- **Form state**: adicionar `cliente: ''` ao `emptyForm()`
- **Campo no formulario** (apos "No do pedido", ~linha 203): campo texto opcional
- **handleSubmit**: incluir `cliente: form.cliente` no payload do `addOrder`
- Extras nao usa rascunhos, sem alteracao nessa parte

#### 6. `src/lib/drafts.ts` — Interface Draft

- Adicionar `cliente: string` ao interface `Draft`

#### 7. `src/pages/DraftsPage.tsx` — Busca + exibicao do cliente

- Adicionar state `search` (string)
- Adicionar campo `<Input>` com placeholder "Pesquisar por numero ou cliente..." no topo
- Filtrar `drafts` pela busca: `numeroPedido` ou `form.cliente` contendo o texto digitado
- Na listagem, mostrar o campo `cliente` ao lado do numero quando preenchido:
  `{draft.numeroPedido || 'Sem número'} {draft.form.cliente && `— ${draft.form.cliente}`}`

#### 8. Visibilidade do campo "Cliente" nos pedidos existentes

**Regra nos locais onde pedidos sao exibidos** (OrderDetailPage, ReportsPage, fichas PDF):
- Para admins: ocultar campo `cliente` EXCETO quando `order.vendedor === 'Rancho Chique'`
- Para revendedores: mostrar normalmente

Isso sera aplicado em:
- `src/pages/OrderDetailPage.tsx`: na exibicao dos detalhes do pedido
- `src/pages/ReportsPage.tsx`: na ficha de producao PDF (se relevante)

### Detalhes tecnicos

- A coluna `cliente` no banco e `text NOT NULL DEFAULT ''` — nao quebra pedidos existentes
- O campo `cliente` do draft e salvo dentro de `draft.form.cliente` (mesmo padrao dos outros campos)
- A verificacao de "Rancho Chique" usa `order.vendedor === 'Rancho Chique'` (nome completo do perfil "site")

