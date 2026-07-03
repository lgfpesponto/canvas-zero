# Nova página "Modelos" + fluxo "Comprar"

## 1. Backend — migração
Adicionar coluna `tipo` em `order_templates` e **backfill dos modelos antigos** usando o marcador `form_data.__tipo` que já existe:

```sql
ALTER TABLE public.order_templates
  ADD COLUMN IF NOT EXISTS tipo TEXT;

UPDATE public.order_templates
SET tipo = CASE
  WHEN (form_data->>'__tipo') = 'cinto' THEN 'cinto'
  ELSE 'bota'
END
WHERE tipo IS NULL;

ALTER TABLE public.order_templates
  ALTER COLUMN tipo SET NOT NULL,
  ALTER COLUMN tipo SET DEFAULT 'bota',
  ADD CONSTRAINT order_templates_tipo_check CHECK (tipo IN ('bota','cinto'));
```

Assim modelos antigos ficam exatamente onde foram criados (bota fica bota, cinto fica cinto).

- Ao salvar novo modelo em `OrderPage` → `tipo='bota'`.
- Ao salvar em `BeltOrderPage` → `tipo='cinto'`.
- `useTemplateManagement` passa a ler/gravar `tipo` (e propaga em `sendTemplateToUsers` para manter o tipo original).

## 2. Nova rota `/modelos`
- Nova página `src/pages/ModelosPage.tsx`, rota `/modelos` em `App.tsx`.
- Novo item no `Header` ao lado de "Faça seu Pedido": **Modelos**. Escondido para `bordado`/`montagem`/`admin_producao` (mesma regra do menu de pedido).
- Cards no mesmo estilo do `TemplateCard` atual (foto grande `object-contain`, nome embaixo). Ordenados por `created_at DESC`.
- Filtros (até 2 ativos ao mesmo tempo):
  - Busca por nome.
  - Chips "Bota" e "Cinto" (multi-select — ambos ligados = mostra todos).
- Botão único no card: **Comprar**. Sem checkbox, sem menu editar/excluir/enviar (edição continua no diálogo dentro do Faça seu Pedido).

## 3. Fluxo "Comprar"
Ao clicar em **Comprar** num card:

### Etapa A — Modal "Complete a identificação"
Dialog que exibe **apenas os campos de identificação vazios** no `form_data` do modelo, respeitando a lista:
`cliente, tamanho, whatsapp, vendedor, observacao, sob_medida`.
- Aplicar as mesmas regras de visibilidade por role já usadas em `OrderPage`/`BeltOrderPage`.
- Se o modelo já tem o valor salvo, o campo **não aparece**.
- Botão **Conferir e finalizar** → Etapa B.

### Etapa B — Espelho da ficha
- Renderiza o espelho padrão do pedido a partir de `form_data` do modelo + overrides da Etapa A.
- Dois botões:
  - **Editar** → volta para Etapa A (só campos faltantes; nada do modelo é editável).
  - **OK, finalizar** → cria o pedido chamando o mesmo submit já usado por `OrderPage` (se `tipo='bota'`) ou `BeltOrderPage` (se `tipo='cinto'`), com o payload mesclado. Redireciona para a página do pedido criado.

## 4. Detalhes técnicos
- Extrair função de submit/criação de pedido de `OrderPage` e `BeltOrderPage` para helpers reutilizáveis (`createBotaOrder`, `createCintoOrder`) para chamar do fluxo Comprar sem duplicar regras (preço, atribuição, snapshots, etc.).
- Espelho: reaproveitar o componente/JSX já usado no submit atual; extrair para `src/components/orders/EspelhoFicha.tsx` recebendo `{ tipo, formData }` se necessário.
- Campo vazio: `!form_data[key] || String(form_data[key]).trim() === ''`. `sob_medida` vazio = `undefined`/`null`/`false` sem detalhes.
- Sem alteração em PDFs, comissão, notificações, atribuição, preço.

## 5. Fora do escopo
- Editar/excluir/enviar modelo pela nova página.
- Alterar o `TemplatesDialog` atual dentro do Faça seu Pedido.
- Mudanças em relatórios, dashboard, RLS além da nova coluna.
