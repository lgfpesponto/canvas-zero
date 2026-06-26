# Integração Bagy — Fases 1, 2 e 2.5 (revisado)

## Sobre o SKU não aparecer na tela do pedido Bagy
**Sem problema.** A tela do admin Bagy não mostra o SKU pra ficar limpa, mas o **webhook envia o SKU da variação no JSON** (campo `items[].variation.sku` / `items[].sku`). É exatamente daí que vamos ler. Pré-requisito continua sendo: cada variação na Bagy precisa ter o SKU preenchido igual ao do Portal.

## Decisões fechadas (consolidadas)
- **Rota:** `/rancho-chique/pedidos` — `admin_master`, `admin_producao`, usuário `site`.
- **Prefixo `RC-`** em todo pedido do vendedor `site` (Bagy ou manual). Bagy: `RC-<numero_bagy>`.
- **Trigger de baixa:** só status Bagy `paid`/`approved`. Devolução = soma de volta.
- **Nunca seta valor absoluto** de estoque, só delta.

## Fluxo por SKU (decidido no webhook)
**A) SKU no `estoque_produtos` → compra automática e RÁPIDA**
- Chama `comprar_estoque` direto na transação do webhook (sub-segundo).
- Cria pedido `RC-<bagy>`, baixa estoque, comissão entra pro `site`.
- Badge verde **"PEDIDO CRIADO"**.
- **Atualiza status na Bagy → "separado"** (via API, ver "Sync de status" abaixo).

**B) SKU no `order_templates.sku` → botão "Gerar ficha"**
- Item entra na lista com badge azul **"GERAR FICHA"**.
- Clicar abre **a mesma tela de conferência** que já existe pra ficha (não o formulário de criação). Pré-preenchida com:
  - Template: tudo que está em `order_templates.form_data` (campos da ficha + foto URL + gênero).
  - Herdado do pedido Bagy: número `RC-<bagy>`, cliente, whatsapp, endereço, tamanho do item, vendedor `site`.
- Você confirma → pedido criado.
- **Fluxo em lote:** se vários pedidos estão "GERAR FICHA" e você marca todos → abre conferência **um por vez**, aprova/edita, próximo abre. Sai do lote quando termina ou cancela.
- Depois de gerada a ficha → **status Bagy atualizado para "em produção"**.

**C) SKU não encontrado → fica esperando**
- Badge amarelo **"SEM MAPEAMENTO"** + alerta no topo.
- Quando você cadastrar o produto no estoque OU criar um template com aquele SKU, botão **"Reprocessar"** roda A ou B retroativo.

## Mudanças nos modelos/rascunhos (`order_templates`)
- Nova coluna `sku TEXT NULL` (indexada).
- Nova coluna `genero TEXT NULL` (Masculino / Feminino / Unissex).
- Foto URL: **reaproveitar o que já é salvo** em `form_data` (campo de foto/URL existente nos templates). Sem schema novo.
- Validações no editor de template:
  - SKU é livre (não único, só warning se duplicado).
  - Gênero opcional, mas se preenchido vira default no pedido gerado.
- **Editor de template visível apenas para `vendedor_comissao`** (e admins, óbvio). Outros papéis não veem os campos novos.

## Sync de status Portal ↔ Bagy (Fase 2.5)
Precisa do `BAGY_API_TOKEN` (você já me passou — vou salvar como secret). Sem ele, só importa pedidos, não atualiza Bagy.

| Evento no Portal | Status na Bagy |
|---|---|
| Pedido de estoque criado (caminho A) | `separated` ("Separar") |
| Ficha gerada (caminho B) | `production` ("Produzir") |
| Etiqueta de envio emitida + código de rastreio | `shipped` + `tracking_code` |
| Pedido marcado como entregue no Portal | `delivered` |
| Pedido cancelado no Portal | `canceled` (volta estoque) |

- Implementado em fila assíncrona (`bagy_status_sync_queue`): trigger no `orders` (quando vendedor=`site`) e em `bagy_pedido_itens` enfileira; edge function `bagy-status-push` consome via `pg_cron` a cada minuto + retry/backoff.
- A mesma mudança feita direto na Bagy (cliente lá moveu pra "despachado" etc.) já vem pelo webhook e reflete no Portal — sem loop (idempotência por checksum do estado).
- Etiqueta de envio entra na Fase 3 (Melhor Envio). Enquanto isso, botão "Marcar como despachado manualmente" pede o código de rastreio e dispara o sync.

## Banco (resumo)
- `bagy_pedidos`, `bagy_pedido_itens`, `bagy_webhook_log` (como antes).
- `bagy_status_sync_queue`: id, bagy_order_id, target_status, tracking_code (nullable), tentativas, ultimo_erro, processado_em.
- `order_templates`: + `sku`, + `genero`.
- Coluna em `orders`: `bagy_order_id TEXT NULL` (pra fechar o loop sem depender de `bagy_pedidos.order_id_portal`).

## Velocidade do caminho A
- Webhook executa: valida token → upsert log → upsert `bagy_pedidos` → pra cada item match em `estoque_produtos` → `comprar_estoque` numa transação só → responde 200.
- Alvo: < 800 ms ponta a ponta (sem chamada à API Bagy bloqueante — o `separated` vai pra fila e propaga em segundos).
- Se a API Bagy estiver lenta, isso **não atrasa** o webhook nem a baixa do portal.

## Edge functions
- `bagy-webhook` — recebe pedido, executa caminho A/B/C, enfileira status.
- `bagy-status-push` — consome fila, faz `PUT /orders/{id}` na Bagy com novo status + tracking, com retry.
- (Fase 3) `melhor-envio-etiqueta` — gera etiqueta, devolve tracking, dispara `shipped`.

## Tela `/rancho-chique/pedidos`
- Tabela + filtros + alertas (como antes).
- Linha do pedido mostra: status Bagy atual + status Portal + badges A/B/C.
- Ações: **Gerar ficha** (B), **Ver pedido** (A), **Reprocessar** (C), **Marcar despachado + rastreio** (até Fase 3), **Gerar NFe**, **Imprimir resumo**.
- Botão "Gerar ficha em lote" quando vários selecionados → wizard 1 por vez.

## Fases
- **Fase 1:** webhook, banco, página, caminho A com `comprar_estoque` automático, sync de status `separated` via fila.
- **Fase 2:** `sku` + `genero` em `order_templates`, botão "Gerar ficha" (single + lote), tela de conferência reaproveitada, sync de status `production`.
- **Fase 2.5:** botão "Marcar despachado + rastreio" → sync `shipped`; sync `delivered` e `canceled`.
- **Fase 3:** Melhor Envio (gera etiqueta + rastreio automático).

## Pendências da sua parte (sem urgência)
1. Preencher SKUs nas variações Bagy (a integração já fica pronta esperando).
2. Cadastrar templates com SKU + gênero conforme for vendendo na Bagy.

Confirma que posso seguir com Fase 1 + 2 + 2.5?
