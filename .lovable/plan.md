## Objetivo
Tornar a página **Pedidos Bagy** (`/rancho-chique/pedidos`) operacional sem sair da lista: gerar ficha direto na linha, em massa, com fluxo Espelho → Finalizar/Editar sobreposto. Corrigir nome do cliente vindo da Bagy. Formalizar que as flags internas funcionam como **status internos do portal** que ao avançarem disparam atualização automática na Bagy.

## 0. Conceito de status (flags = status internos do portal)

As flags atuais (`sem_mapeamento`, `aguardando_ficha`, `pedido_criado`) passam a ser tratadas como **etapas internas do portal Bagy** — não vão pra Bagy. A Bagy só recebe quando o pedido cruza pra produção real:

| Flag portal | Significado | Ação na Bagy |
|---|---|---|
| `sem_mapeamento` | SKU não casa com nenhum template/estoque | nada |
| `aguardando_ficha` | mapeado, falta gerar ficha | nada |
| `pedido_criado` | ficha gerada, pedido no portal | enfileira **`production`** na Bagy |
| `pronta_entrega_separada` | item veio do Estoque (já tem peça) | enfileira **`separated`** na Bagy |

Implementação:
- Ao **OK — Finalizar** no espelho (item tipo modelo/ficha): pedido cai em portal com status `Aguardando produção`, flag Bagy vira `pedido_criado`, insere em `bagy_status_sync_queue` com `target_status='production'` (já existe esse caminho — só consolidar).
- Quando o item Bagy é resolvido contra `estoque_produtos` (pronta entrega — fluxo do `bagy-webhook` `comprar_estoque_bagy`): flag vira `pronta_entrega_separada` e enfileira `target_status='separated'`.
- A fila `bagy_status_sync_queue` continua sendo drenada por `bagy-status-push` (já existe). Confirmar que ela roda automático após o insert (toast de sucesso já indica isso no código atual).

## 1. Botão "Gerar ficha" na linha (sem duplicar badge)

`src/pages/RanchoChiquePedidosPage.tsx`:

- Quando `flag = 'aguardando_ficha'`, **substituir** o badge azul `GERAR FICHA` por um **botão azul `Gerar ficha`** no mesmo slot da linha (sem mostrar os dois).
- Pedidos com múltiplos itens pendentes: o botão da linha abre o dialog com fila dos itens daquele pedido.
- Os demais badges (`SEM MAPEAMENTO`, `PEDIDO CRIADO`, `AGUARDANDO PAGAMENTO`) continuam como badges.

## 2. Fluxo "Gerar ficha" sobreposto (sem trocar de página)

Trocar `navigate('/pedido', { state: { bagyPrefill } })` por um **dialog `BagyFichaDialog`** (`src/components/bagy/BagyFichaDialog.tsx`) que abre por cima da lista (pedidos seguem ao fundo, igual `Dialog` shadcn).

Comportamento:
1. Carrega template + override de `cliente`, `whatsapp`, `tamanho`, `foto_url`, `numero = RC-<numero_bagy>`, vendedor = profile `site` (mesma lógica de `OrderPage.bagyPrefill` linhas 685–723).
2. Renderiza **só o Espelho da Ficha de Produção** (layout idêntico ao `OrderPage` linhas ~1960+: COMPOSIÇÃO, IDENTIFICAÇÃO, COUROS, BORDADOS, PESPONTO, SOLADOS, FINALIZAÇÃO).
3. Rodapé do espelho:
   - **OK — Finalizar** → salva pedido + executa o pós-save Bagy (linhas 1093–1113 do `OrderPage`: vincula `bagy_order_id`, marca item `ficha_gerada`, pedido `pedido_criado`, enfileira `production`).
   - **Editar** → troca o conteúdo do mesmo dialog para o formulário completo da ficha. Ao clicar "Pré-visualizar" volta ao espelho.
   - **Cancelar / X** → fecha sem salvar.

**Refactor:** extrair de `OrderPage.tsx` um componente `FichaBotaForm` reusável (form + espelho), parametrizado por `bagyPrefill` + callbacks `onSaved` / `onCancel`. `OrderPage` continua usando o mesmo componente.

## 3. Geração em massa (fila estilo WhatsApp)

Na barra flutuante de seleção, adicionar **`Gerar fichas (N)`** habilitado quando há ≥1 item `aguardando_ficha` entre os selecionados.

Comportamento:
- Monta fila `[ {pedidoId, itemId}, ... ]` apenas com itens `aguardando_ficha`; demais são pulados.
- Abre `BagyFichaDialog` com header `1/N`.
- Após **OK — Finalizar** ou **Pular este**, avança automático ao próximo (recarrega template/prefill).
- Botões no modo fila: **Pular este**, **Cancelar fila**.
- Final: toast `X ficha(s) geradas, Y pulada(s)` e recarrega lista.

## 4. Corrigir nome do cliente (Larissa / Maria)

`supabase/functions/bagy-webhook/index.ts` linhas 279–284 — `clienteNome` cai pra `first_name` sozinho. Mudar para:

```ts
clienteNome =
  customer.name
  || customer.full_name
  || [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim()
  || shippingAddr?.recipient
  || shippingAddr?.name
  || order.customer_name
  || null
```

Rodar `bagy-reprocess` nos pedidos `17824787352288` (Larissa) e `17824773741752` (Maria) para reescrever o nome.

## Detalhes técnicos

- Novo: `src/components/bagy/BagyFichaDialog.tsx` (dialog + estado de fila + modo espelho/edição).
- Refactor: extrair `FichaBotaForm` de `src/pages/OrderPage.tsx` (form + espelho). Sem mudar regras de preço/composição.
- `RanchoChiquePedidosPage.tsx`:
  - Badge `aguardando_ficha` vira botão na linha.
  - `gerarFicha` chama `openBagyFichaDialog({ queue: [...] })` em vez de `navigate('/pedido', ...)`.
  - Botão `Gerar fichas (N)` na barra flutuante.
- Migrations: nenhuma.

## Fora de escopo
- Lógica de SKU/mapeamento (já tratada).
- NF-e, etiqueta Melhor Envio.
- `OrderPage` standalone (rota `/pedido`) continua funcionando para criação manual.