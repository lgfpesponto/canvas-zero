# Nova página "Modelos" + fluxo "Comprar"

## 1. Backend
Adicionar coluna `tipo` em `order_templates` para separar por onde o modelo foi criado:

- Migração: `ALTER TABLE public.order_templates ADD COLUMN tipo TEXT NOT NULL DEFAULT 'bota' CHECK (tipo IN ('bota','cinto'));`
- Modelos existentes ficam como `bota` (podem ser corrigidos manualmente depois).
- Ao salvar modelo em `OrderPage` → grava `tipo='bota'`.
- Ao salvar modelo em `BeltOrderPage` → grava `tipo='cinto'`.
- `useTemplateManagement` passa a ler/gravar `tipo` (e enviar em `sendTemplateToUsers` para manter o tipo original).

## 2. Nova rota `/modelos`
- Nova página `src/pages/ModelosPage.tsx`, rota `/modelos` em `App.tsx`.
- Novo item no `Header` ao lado de "Faça seu Pedido": **Modelos**. Escondido para `bordado`/`montagem`/`admin_producao` (mesma regra do menu de pedido).
- Layout: cards no mesmo estilo do `TemplateCard` atual (foto grande `object-contain`, nome embaixo). Ordenados por `created_at DESC` (último criado primeiro).
- Filtros (permite 2 ativos ao mesmo tempo):
  - Campo de busca por nome.
  - Chips "Bota" e "Cinto" (multi-select — ambos ligados = mostra todos).
- Botão principal do card: **Comprar** (substitui "Preencher/Selecionar"). Sem checkbox de envio em lote, sem menu de editar/excluir — a página é só consumo. (Edição continua no diálogo dentro do Faça seu Pedido.)

## 3. Fluxo "Comprar"
Ao clicar em **Comprar** num card:

### Etapa A — Modal "Complete a identificação"
Dialog compacto que exibe **apenas os campos de identificação vazios** no `form_data` do modelo, respeitando a lista pedida:
`cliente, tamanho, whatsapp, vendedor, observacao, sob_medida`.
- Aplicar as mesmas regras de visibilidade por role já usadas hoje em `OrderPage`/`BeltOrderPage` (ex.: `cliente` oculto para roles que não veem cliente; `vendedor` só para quem seleciona vendedor).
- Se o modelo já tem o valor salvo, o campo **não aparece** (mesmo que seja da lista).
- Botão **Conferir e finalizar** → Etapa B.

### Etapa B — Espelho da ficha
- Renderizar o espelho/preview padrão do pedido (mesmo componente já usado hoje para o "espelho" no fluxo Bota/Cinto), montado a partir de:
  - `form_data` completo do modelo +
  - overrides da Etapa A.
- Dois botões:
  - **Editar** → volta para Etapa A (mostrando de novo só os campos faltantes; nada do modelo é editável aqui).
  - **OK, finalizar** → cria o pedido chamando exatamente o mesmo `submit` já usado pelo formulário correspondente (`OrderPage` se `tipo='bota'`, `BeltOrderPage` se `tipo='cinto'`), com o payload mesclado. Redireciona para a página do pedido criado (mesmo destino atual pós-submit).

## 4. Detalhes técnicos
- Reaproveitar handlers existentes: extrair a função de submit/criação de pedido de `OrderPage` e `BeltOrderPage` para helpers reutilizáveis (`createBotaOrder`, `createCintoOrder`) para chamar do fluxo Comprar sem duplicar regras (preço, atribuição, snapshots, etc.).
- Espelho: reaproveitar o componente/JSX de espelho já usado no submit de bota/cinto. Se hoje ele vive dentro da página, extrair para `src/components/orders/EspelhoFicha.tsx` recebendo `{ tipo, formData }`.
- Definição de "campo vazio": `!form_data[key] || String(form_data[key]).trim() === ''`. Para `sob_medida` (checkbox/objeto), vazio = `undefined`/`null`/`false` sem detalhes.
- Sem alteração em PDFs, comissão, notificações, atribuição, preço — pedido criado passa pelas mesmas regras dos formulários originais.

## 5. Fora do escopo
- Editar/excluir/enviar modelo pela nova página (continua no diálogo do Faça seu Pedido).
- Alterar o `TemplatesDialog` atual dentro do Faça seu Pedido.
- Mudanças em relatórios, dashboard, RLS além da nova coluna.
