
## Objetivo

Permitir a qualquer usuário registrar um "erro" a partir do detalhe de um pedido. O erro vira um novo pedido (irmão) com valor zerado, herda todas as especificações do original, tem histórico próprio, aparece em relatórios de produção e é linkado nos dois sentidos.

## 1. Banco de dados (migração)

Adicionar em `public.orders`:
- `erro_de_pedido_id uuid REFERENCES public.orders(id) ON DELETE SET NULL` — quando preenchido, indica que este pedido é um ERRO gerado a partir de outro.
- `erro_descricao text` — texto livre descrevendo o erro (obrigatório na criação).
- Índice em `erro_de_pedido_id` para lookup rápido do link inverso.

Sem alterações de RLS: o novo pedido usa as mesmas policies dos pedidos normais (todos os usuários que já criam pedidos podem criar um ERRO).

## 2. Dialog "Registrar Erro"

Novo componente `src/components/orders/RegistrarErroDialog.tsx`:

- Trigger: botão discreto **"Registrar Erro"** (variante outline, cor `destructive`) posicionado na **mesma linha do título "Composição do Pedido"** em `src/pages/OrderDetailPage.tsx` (linha ~810), ao lado do bloco existente.
- Visível para qualquer usuário autenticado.
- **Se já existir** um pedido ERRO para este original: em vez do botão "Registrar Erro", mostra um chip clicável **"ERRO {numero}"** que navega para `/pedido/{id-do-erro}`. (Um único ERRO por pedido — se tentar registrar de novo, dialog bloqueia.)
- Conteúdo do dialog:
  - Campo readonly **"Número do pedido ERRO"** = `<numero_original>ERRO` (ex.: `25032ERRO`).
  - Se colisão (já existe esse número), sufixa `ERRO2`, `ERRO3`, etc.
  - Textarea **"Descrição do erro"** (obrigatória).
  - Botões **"Cancelar"** e **"Passar erro"** (primary).

## 3. Criação do pedido-erro

Ao confirmar "Passar erro":
1. Buscar o pedido original completo.
2. Montar payload copiando **todos** os campos de especificação (produto, extras, ficha, cores, tamanhos, cliente, vendedor, tipo_extra, extra_detalhes, etc.), **exceto**:
   - `id` (novo), `numero` = número ERRO calculado,
   - `preco` = 0, `quantidade` = 1,
   - `historico` = uma entrada inicial: `"Pedido ERRO registrado a partir de #<numero_original>: <descrição>"` com data/hora/usuário atuais,
   - `data_criacao` / `hora_criacao` = agora,
   - `status` = status inicial do fluxo (mesma etapa em que pedidos novos entram — "Iniciando", conforme fluxo atual),
   - `conferido` = false, `conferido_em/por` = null,
   - `erro_de_pedido_id` = id do original,
   - `erro_descricao` = texto do dialog,
   - Zerar campos financeiros: `desconto`, `desconto_justificativa`, snapshots de preço, `preco_congelado` = false.
3. `INSERT` via supabase client; ao sucesso, `navigate(/pedido/${novoId})` e toast.

## 4. Exibição no pedido ERRO (detalhe)

Em `OrderDetailPage.tsx`, quando `order.erroDePedidoId`:
- Cabeçalho ganha bloco extra: **"Pedido de erro do #{numero_original}"** clicável → navega para o original.
- Mostra data/hora de criação do ERRO e a **descrição do erro** (destacada, cor destructive).
- **Composição**: substituir a lista atual por uma **única linha "ERRO — R$ 0,00"** e Subtotal/Total = R$ 0,00.
- Detalhes técnicos (produto, cores, tamanhos, extras, cliente, vendedor…): renderizar normalmente puxando do próprio pedido (que já herdou tudo do original).
- **Histórico**: só o do próprio pedido ERRO (comportamento default já é esse).
- Botão "Registrar Erro" **não** aparece dentro de um pedido que já é ERRO.

## 5. Exibição no pedido original

- Ao lado do título "Composição do Pedido", quando existir ERRO ligado, mostrar chip clicável **"ERRO {numero_erro}"** → navega para o pedido ERRO.
- Lookup: SELECT `id, numero` FROM orders WHERE `erro_de_pedido_id = order.id` LIMIT 1 (feito em hook novo `useLinkedErro(order)`).

## 6. Relatórios e progresso de produção

- Pedido ERRO tem `tipo_extra`, `produto`, especificações completas → já aparece automaticamente nas listagens e nos relatórios de produção (Corte, Bordados, Forro, Solado, Extras) sem código adicional.
- Prefixo `ERRO` já está em `EXCLUDED_PREFIXES` (usado em métricas de vendas/comissão) — mantém pedido ERRO **fora de faturamento/comissão**, o que é o comportamento correto (valor zerado).
- Fluxo de status: sem alterações — o ERRO passa pelas mesmas etapas que qualquer pedido do mesmo tipo.

## 7. Arquivos afetados

- **migração SQL** (novos campos + índice).
- `src/lib/order-logic.ts` — mapear `erro_de_pedido_id` ↔ `erroDePedidoId` e `erro_descricao` ↔ `erroDescricao` em `dbRowToOrder` / reverso; adicionar tipos no `Order` (`src/contexts/AuthContext.tsx`).
- `src/components/orders/RegistrarErroDialog.tsx` (novo).
- `src/hooks/useLinkedErro.ts` (novo) — devolve `{ id, numero } | null` do ERRO vinculado.
- `src/pages/OrderDetailPage.tsx` — botão/chip na linha do título da composição, bloco de cabeçalho para pedidos ERRO, composição zerada quando `erroDePedidoId`.

## Detalhes técnicos

- Numeração ERRO: função utilitária que tenta `<n>ERRO`, `<n>ERRO2`, `<n>ERRO3`… até achar livre (`SELECT id FROM orders WHERE numero = ? LIMIT 1`).
- Cópia de campos: usar o mapa `orderToDbRow` existente para não esquecer nenhum atributo; sobrescrever só os campos listados em §3.
- Sem alterações em edge functions, PDFs ou fluxo de cobrança nesta entrega.
