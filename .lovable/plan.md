## Página Pedidos Bagy — checkbox em todos, bulk reprocessar, envio, NCM, e visual com NF/Etiqueta

### 1. Checkbox em cada pedido + ações em massa

- Hoje só pedidos com `order_id_portal` mostram checkbox (pra sincronizar Bagy). Mudar: **todo pedido** ganha checkbox de seleção.
- Estado `selected` continua sendo `Set<string>` mas guarda `pedido.id` (id da linha em `bagy_pedidos`), não mais `order_id_portal`.
- Barra flutuante de seleção passa a ter três botões:
  - **Reprocessar selecionados** (novo, bulk).
  - **Atualizar status na Bagy** (só envia os selecionados que têm `order_id_portal`; mostra "X de Y elegíveis").
  - **Gerar NF-e (em breve)** e **Imprimir etiqueta (em breve)** — desabilitados, com tooltip "Disponível após integração". Visual só.
- "Reprocessar" individual e bulk: chama uma nova edge function `bagy-reprocess` que, dado um conjunto de `bagy_pedidos.id`, reexecuta a lógica do webhook usando `payload` salvo. Substitui o stub atual que só mostra toast de erro.

### 2. Status na Bagy — incluir todos os relevantes + remover "Aberto" confuso

- O filtro topo hoje mistura "flag interna" com nada de status Bagy. Trocar pra dois selects lado a lado:
  - **Status Bagy:** Todos, Aprovado, Em produção, Separado, Faturado, Despachado, Entregue, Cancelado.
  - **Situação interna (flag):** Todos, Pedido criado, Aguardando ficha, Sem mapeamento, Erros.
- "Aberto" (`open`) só aparece no mapa de label porque a Bagy às vezes manda assim — manter no map mas tirar do filtro. Adicionar `invoiced: 'Faturado'` ao `STATUS_BAGY_LABEL` (a Bagy usa esse status quando NF é emitida).
- Badge do card mostra label PT-BR do status Bagy (já mostra), mais a flag interna ao lado (já mostra).

### 3. Itens — sem foto, com nome + variação + SKU + meio de envio do pedido

- No expandido, **remover a miniatura** (`<img>` / placeholder `w-12 h-12`).
- Linha de cada item fica: **Nome** em destaque, abaixo `Variação · Tam X · Qtd N · SKU XXX`. Igual já é, só sem a imagem.
- No bloco "Cliente/Endereço", **adicionar uma terceira coluna ou linha "Envio"** com o método escolhido pelo cliente (`shipping_method` / `shipping.name` / `freight_name` / `selected_shipping.name` no payload Bagy) e o valor do frete. Mapear no edge `bagy-webhook` salvando em nova coluna `metodo_envio TEXT` em `bagy_pedidos`.

### 4. NCM puxado da Bagy

- Adicionar coluna `ncm TEXT` em `bagy_pedido_itens`.
- No webhook, extrair de `it.ncm`, `it.product.ncm`, `it.tax.ncm`, `it.variation.ncm` (a Bagy expõe quando configurado no produto).
- Mostrar NCM ao lado do SKU na linha do item, quando presente: `· NCM 6403.91.90`.

### 5. Botões NF-e e Etiqueta (visual)

- No rodapé de ações de cada pedido expandido, adicionar (sempre visíveis quando há `order_id_portal`):
  - `Gerar NF-e` (ícone `FileText`) — `disabled`, tooltip "Integração NF-e em configuração".
  - `Imprimir etiqueta` (ícone `Printer`) — `disabled`, tooltip "Integração Melhor Envio em configuração".
- Botão "Atualizar status na Bagy" + "Reprocessar" + "Marcar despachado + rastreio" + "Ver pedido no portal" continuam funcionando.
- Estes mesmos dois botões aparecem na barra flutuante de bulk (também desabilitados).

### 6. Migration

```sql
ALTER TABLE public.bagy_pedidos ADD COLUMN IF NOT EXISTS metodo_envio text;
ALTER TABLE public.bagy_pedido_itens ADD COLUMN IF NOT EXISTS ncm text;
```

### 7. Nova edge function `bagy-reprocess`

- Input: `{ pedido_ids: string[] }` (ids de `bagy_pedidos`).
- Para cada um: lê `payload` salvo + token interno e roda a mesma rotina do webhook (refatorar webhook extraindo um `processOrderPayload(supabase, payload)` reutilizável).
- Retorna `{ results: [{ pedido_id, ok, message }] }`.
- Frontend chama com chunk de 5, mesma UX da sincronização atual.

### Fora de escopo

- Implementação real de NF-e e Melhor Envio (só visual desabilitado).
- Mexer em telas de modelo/ficha.

### Diagrama do header da lista

```text
[ Buscar... ]  [ Status Bagy ▾ ]  [ Situação ▾ ]
[x] Selecionar todos visíveis · 3 selecionado(s)
```

### Barra flutuante

```text
3 selecionado(s) | Limpar | [Reprocessar] [Atualizar Bagy (2/3)] [NF-e (em breve)] [Etiqueta (em breve)]
```
