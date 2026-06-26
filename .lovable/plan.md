
# Fase 14 — Ajustes finais do fluxo Bagy

Resolve os problemas reportados na página Pedidos Bagy e na criação de Modelo (template).

---

## 1) Pedidos Bagy: somente novos pedidos aprovados, com data/hora da Bagy

Hoje a página lista qualquer pedido vindo do webhook (inclusive `new`, `open`, `pending`, `archived`, `cancelado`) e usa `created_at` do registro no nosso banco (data em que recebemos), não a data real da loja.

Mudanças:
- **Webhook (`bagy-webhook`)**:
  - Só insere/atualiza em `bagy_pedidos` quando o status Bagy estiver em `APPROVED_STATUSES` (`paid`/`approved`/`production`/`separated`/`shipped`/`delivered`/`completed`). Status `new`/`open`/`pending`/`canceled`/`archived` apenas são logados em `bagy_webhook_log` e ignorados (resposta `ok: true, skipped: 'status_nao_aprovado'`).
  - Captura a data real do pedido na Bagy: campos `created_at`, `created`, `date`, `purchased_at` do payload e grava em nova coluna `bagy_created_at` (timestamptz).
- **Migration**: adicionar `bagy_created_at timestamptz` em `bagy_pedidos`.
- **Página `RanchoChiquePedidosPage.tsx`**:
  - Ordenar por `bagy_created_at desc` (fallback `created_at`).
  - Mostrar `bagy_created_at` em vez de `created_at` na linha do pedido e no detalhe.
  - Limpar (uma vez, via migration) os pedidos antigos com status fora de aprovado: `DELETE FROM bagy_pedidos WHERE status_bagy NOT IN (...)` para sumir com Maria Gabriela cancelada, Luana/Daniela `open`, Camila `archived` etc.

## 2) Forma de pagamento, CPF/CNPJ e valor — puxar do pedido Bagy

Já gravamos `cliente_doc`, `total` e `pagamento`, mas o webhook nem sempre acha `payment_method` (Bagy envia em `payments[0].method` ou `payment.method`). Ajustar `pick(...)` para também olhar:
- `payments.0.method`, `payments.0.payment_method`, `payment.payment_method`, `payment_method_name`.
- Mapeamento básico para PT-BR no front (`pix → Pix`, `credit_card → Cartão de Crédito`, `boleto → Boleto`, `billet → Boleto`).

Quando o pedido for criado no portal (RPC `comprar_estoque_bagy`), passar também CPF/CNPJ, valor total e forma de pagamento para preencher os campos correspondentes na ficha do portal (`cliente_cpf_cnpj`, `forma_pagamento` ou equivalente — vou inspecionar a RPC e a coluna disponível em `orders`; se não houver, criar colunas/usar `observacoes`).

## 3) Botões "Gerar nota fiscal" e "Imprimir etiqueta" no pedido do portal

Investigar por que não aparecem para os pedidos vindos da Bagy. Hipóteses:
- O pedido foi criado com status `Cancelado` ou `Pendente` que não habilita os botões.
- Falta o `cliente_cpf_cnpj` (NF exige CPF/CNPJ).
- O acesso à NF está restrito a Igor/Stefany ADM via `useNfeAccess` — confirmar que admin_master tem acesso e que a tela mostra mesmo sem item de "modelo" tradicional.

Ação: abrir `OrderDetailPage` e o componente da NF, garantir que pedidos Bagy (vendedor "site") cumprem as condições; quando faltar CPF/CNPJ, mostrar aviso explicando.

## 4) Página "Criar Modelo" — incluir URL da foto e Grade de Tamanhos/SKU

Hoje o template guarda só `nome`, `sku` (único), `genero` e `form_data`. A foto e a grade de tamanhos ficam de fora; isso quebra o caminho automático Bagy quando o SKU varia por tamanho.

Mudanças:
- **Migration** em `order_templates`:
  - `foto_url text` — URL da foto de referência (Drive) do modelo.
  - `tamanhos_skus jsonb` — array `[{ tamanho: "34", sku: "TEX-AMANDA-PE-34" }, ...]`.
- **`useTemplateManagement.ts`**: passar a ler/gravar `foto_url` e `tamanhos_skus`.
- **`OrderPage.tsx` (modo template)**:
  - Adicionar campo **Link da Foto de Referência** (mesmo controle do modo pedido) logo após Nome/SKU/Gênero.
  - Adicionar bloco **Tamanhos disponíveis + SKU por tamanho** (lista dinâmica de pares Tamanho × SKU). O campo "SKU Bagy" do topo passa a ser **opcional** e funciona como SKU base/único quando o modelo não varia por tamanho.
  - Continuar deixando de fora os campos de identificação do pedido (número, cliente, WhatsApp, vendedor) conforme já está.
- **Webhook**: ao buscar template por SKU, considerar `order_templates.tamanhos_skus[*].sku` (RPC ou query JSONB) além do `sku` raiz; ao casar por tamanho, devolver o template + SKU de tamanho casado.
- **Geração da ficha automática** (`gerarFicha` na página Bagy + `bagyPrefill` no OrderPage):
  - Pré-preencher a Foto a partir de `template.foto_url` (já passa `fotoUrl` do item, mas hoje vem do `item.foto_url` da Bagy — usar `foto_url` do template como fallback ou prioridade conforme você preferir; padrão: prioridade template).
  - Pré-preencher o campo Tamanho com o tamanho casado.

## 5) Traduções na lista Pedidos Bagy

Status `open` e `archived` aparecem em inglês. Adicionar ao `STATUS_BAGY_LABEL`:
- `open: 'Aberto'`, `archived: 'Arquivado'`, `processing: 'Processando'`, `completed: 'Concluído'`, `returned: 'Devolvido'`.

Como agora só listamos aprovados (item 1), na prática os "open/archived" deixam de aparecer; o mapa fica como rede de segurança.

---

## Detalhes técnicos

```text
bagy_pedidos
  + bagy_created_at  timestamptz       -- data real da Bagy
order_templates
  + foto_url         text              -- URL Drive da referência
  + tamanhos_skus    jsonb DEFAULT '[]' -- [{tamanho, sku}]
```

Resposta do webhook para status não aprovado: `{ ok: true, skipped: "status_nao_aprovado", status: <statusBagy> }`. Mantém o log para auditoria.

Busca de template por SKU (PostgREST):
```sql
-- match raiz OU dentro do array
select id, foto_url, tamanhos_skus
from order_templates
where sku ilike $1
   or exists (
     select 1 from jsonb_array_elements(tamanhos_skus) e
     where e->>'sku' ilike $1
   )
limit 1;
```

Limpeza única no momento da migration:
```sql
DELETE FROM bagy_pedidos
WHERE status_bagy NOT IN ('paid','approved','production','separated','shipped','delivered','completed');
```

## Fora do escopo
- Mudanças no fluxo de NF/etiqueta além de desbloquear sua exibição para pedidos Bagy (resolveremos só o que estiver impedindo a renderização).
- Reescrita do criador de modelos de Cinto (`BeltOrderPage`) — só Bota agora; se quiser depois eu replico.

## Resultado esperado
- A lista mostra **apenas** pedidos aprovados pela Bagy, em PT-BR, com data/hora da loja.
- Cada pedido traz CPF/CNPJ, valor e forma de pagamento; portal exibe "Gerar nota fiscal" e "Imprimir etiqueta".
- Em "Criar Modelo" dá pra cadastrar foto e a grade Tamanho→SKU; quando a Bagy envia o SKU de um tamanho, o portal acha o template, gera a ficha já com a foto e o tamanho corretos.
