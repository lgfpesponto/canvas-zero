

## Plano de Implementação — 7 Melhorias

### 1. Bloquear scroll em campos numéricos de preço/valor

**Problema:** Campos `type="number"` mudam valor ao rolar o mouse.

**Solução:** Adicionar `onWheel={e => e.currentTarget.blur()}` em todos os `<input type="number">` e `<Input type="number">` nos seguintes arquivos:
- `src/pages/OrderPage.tsx` — adicional valor (~linha 961), qtd strass/cruz/bridão/cavalo (~linhas 885-897)
- `src/pages/BeltOrderPage.tsx` — adicional valor (~linha 420)
- `src/pages/ExtrasPage.tsx` — valorManual (~linha 544), quantidades (~linhas 408, 428, 498, 708)
- `src/pages/EditExtrasPage.tsx` — valorManual (~linha 426), quantidades (~linhas 290, 310, 369)
- `src/components/ui/input.tsx` — alternativa global: adicionar `onWheel` no componente base para `type="number"`

**Abordagem escolhida:** Modificar o componente `Input` em `src/components/ui/input.tsx` para detectar `type="number"` e bloquear scroll automaticamente. Para os `<input>` nativos nas pages, adicionar `onWheel` inline.

### 2. Melhorias nos bordados (Ficha de Bota)

**2.1 — Nova opção "Bordado Variado R$20"**

Adicionar `{ label: 'Bordado Variado R$20', preco: 20 }` nas 3 listas em `src/lib/orderFieldsConfig.ts`:
- `BORDADOS_CANO` (após R$15, antes de R$25)
- `BORDADOS_GASPEA` (idem)
- `BORDADOS_TALONEIRA` (idem)

Também adicionar na lista legada `BORDADOS`.

**2.2 — Separação visual "Bordados Variados"**

Alterar o componente `MultiSelect` em `src/pages/OrderPage.tsx` para inserir um separador visual antes do primeiro "Bordado Variado" quando renderizar os itens de bordado.

**2.3 — Lupa de pesquisa nos bordados**

Transformar o `MultiSelect` de bordados em um componente com campo de busca (filtro de texto). Adicionar um `<input>` de pesquisa no topo da lista de checkboxes que filtra as opções exibidas.

**Arquivos:** `src/lib/orderFieldsConfig.ts`, `src/pages/OrderPage.tsx`

### 3. Pesquisa nas Gravatas Pronta Entrega

Na seção `gravata_pronta_entrega` de `src/pages/ExtrasPage.tsx` (~linha 452-475), adicionar campo de busca para filtrar os itens de stock disponíveis pelo texto (cor_tira + tipo_metal + cor_brilho).

**Arquivo:** `src/pages/ExtrasPage.tsx`

### 4. Relatório Forro — incluir Cintos

No `generateForroPDF` em `src/components/SpecializedReports.tsx` (~linha 401), adicionar uma seção "Cintos" que:
- Filtra pedidos com `tipoExtra === 'cinto'` que estão no progresso de produção filtrado
- Agrupa por tamanho do cinto (`extraDetalhes.tamanhoCinto`)
- Renderiza um quadro com tamanho → quantidade
- Só aparece se houver cintos

**Arquivo:** `src/components/SpecializedReports.tsx`

### 5. Alerta de Pedidos Apagados (Dashboard Juliana)

**Infraestrutura necessária:**
- Nova tabela `deleted_orders` no banco para armazenar pedidos apagados com seus dados completos
- Antes de deletar no `deleteOrder` e `deleteOrderBatch`, copiar os dados do pedido para essa tabela

**Tabela `deleted_orders`:**
- `id` (uuid, PK)
- `order_id` (uuid) — ID original do pedido
- `order_data` (jsonb) — todos os dados do pedido
- `deleted_at` (timestamptz)
- `deleted_by` (uuid) — quem apagou
- `dismissed` (boolean, default false) — "conferido"

**Frontend (Index.tsx):**
- Buscar `deleted_orders` onde `dismissed = false`
- Exibir na seção "Pedidos em alerta" da Juliana
- Botão "olhinho": abre dialog com dados do pedido
- Botão "Voltar pedido": re-insere na tabela `orders` e remove de `deleted_orders`
- Botão "Conferido": marca `dismissed = true`

**Arquivos:** migração SQL, `src/contexts/AuthContext.tsx`, `src/pages/Index.tsx`

### 6. Novo campo "Número do pedido da bota" em Extras

Nos produtos: tiras_laterais, desmanchar, kit_faca, kit_canivete, carimbo_fogo, adicionar_metais.

Adicionar campo de texto após o campo "Nº do pedido":
```
Número do pedido da bota (opcional)
```

Salvar no `extraDetalhes` como `numeroPedidoBotaVinculo`.

**Arquivos:** `src/pages/ExtrasPage.tsx`, `src/pages/EditExtrasPage.tsx`, `src/lib/extrasConfig.ts` (adicionar label)

### 7. Regra Fernanda ADM

**Já implementado** na iteração anterior. Nenhuma alteração necessária.

---

### Resumo de arquivos

| Arquivo | Mudanças |
|---------|----------|
| `src/components/ui/input.tsx` | Bloquear scroll em type=number |
| `src/lib/orderFieldsConfig.ts` | Adicionar "Bordado Variado R$20" |
| `src/pages/OrderPage.tsx` | Separador visual bordados, pesquisa nos bordados, onWheel em inputs nativos |
| `src/pages/ExtrasPage.tsx` | Pesquisa gravatas, campo "nº bota" em extras, onWheel |
| `src/pages/EditExtrasPage.tsx` | Campo "nº bota", onWheel |
| `src/pages/BeltOrderPage.tsx` | onWheel em adicional valor |
| `src/components/SpecializedReports.tsx` | Cintos no relatório Forro |
| `src/contexts/AuthContext.tsx` | Salvar pedido antes de deletar na tabela deleted_orders |
| `src/pages/Index.tsx` | Seção de pedidos apagados no dashboard Juliana |
| `src/lib/extrasConfig.ts` | Label para numeroPedidoBotaVinculo |
| Migração SQL | Tabela `deleted_orders` |

