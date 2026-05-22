# Ajuste retroativo de preço em alterações de variações

## Objetivo

Quando o admin alterar o `preco_adicional` de uma variação já existente (`ficha_variacoes`) ou o `preco` de uma opção (`custom_options`), abrir um diálogo perguntando:

1. Se é aumento ou desconto (calculado automaticamente, só confirma).
2. A partir de qual data essa mudança vale:
   - Desde o início do portal (afeta todos os pedidos passados).
   - A partir de uma data específica do passado.
   - A partir de uma data no futuro (não mexe em pedido nenhum agora, apenas registra a regra).
3. Confirmar — então o sistema gera um ajuste automático nos pedidos afetados de forma que o **valor final cobrado do cliente não mude**: se a Joaquina foi de R$ 30 para R$ 35, pedidos antigos ganham um desconto de R$ 5 por unidade da Joaquina; se foi de R$ 35 para R$ 30, ganham um adicional de R$ 5. Pedidos novos (após a data escolhida) usam o preço novo.

Assim o relatório nunca infla nem encolhe pedidos já fechados, e o histórico fica coerente.

## Fluxo no admin

```text
[Admin edita preço da Joaquina: 30 -> 35] -> Salvar
        |
        v
[Dialog "Mudança de preço detectada"]
  - Variação: Joaquina (Modelo)
  - Antes: R$ 30,00   Depois: R$ 35,00   Diferença: +R$ 5,00
  - Vale a partir de:
      ( ) Início do portal (todos os pedidos)
      ( ) Data específica:  [____/____/____]
      ( ) Só pedidos futuros (a partir de hoje / data futura)
  - Observação (opcional)
  [Cancelar]  [Confirmar e ajustar pedidos]
        |
        v
[Edge function aplica ajuste compensatório nos pedidos elegíveis]
```

Regras de elegibilidade do pedido:
- `created_at < data_corte` (se "início do portal", sem limite inferior).
- Pedido contém a variação alterada (Joaquina no campo Modelo, por exemplo).
- Status diferente de `Cancelado` (cancelado não recebe ajuste, mas fica marcado no histórico).
- Pedido não está em status pós-faturamento bloqueado? Confirmar com você se quer travar algum status (ex.: Entregue/Cobrado já pagos).

Efeito no pedido:
- Acrescenta uma linha em `extra_detalhes.ajustes_retroativos[]` com `{ regra_id, variacao, qtd_aplicada, valor_unit, valor_total, sinal }`.
- Recalcula `desconto`/`adicional_valor` (ou cria coluna dedicada — ver técnico) para neutralizar a diferença.
- Registra no `historico` do pedido: "Ajuste retroativo automático: preço da Joaquina mudou de R$ 30 → R$ 35 em DD/MM. Desconto de R$ 5,00 aplicado para preservar o valor final."

## Histórico e auditoria

Nova aba em Configurações → "Histórico de mudanças de preço":
- Lista cada alteração: variação, antes, depois, data de corte, quem fez, quantos pedidos foram ajustados, valor total compensado.
- Botão "Ver pedidos afetados" abre a lista filtrada.
- Botão "Reverter" só para admin_master, desfaz o ajuste (remove a entrada de `ajustes_retroativos` e reverte o desconto).

## Casos de borda

- Variação nova (não existia antes) → sem dialog, salva direto.
- Preço passou de 0 para X (variação que era grátis) → mesmo fluxo: pedidos antigos ganham desconto X para não inflar.
- Preço passou de X para 0 → pedidos antigos ganham adicional X para não encolher.
- Variação deletada → fora do escopo desta tarefa (continua bloqueada por admin_master).
- Mesma variação editada várias vezes → cada mudança gera sua própria regra com data própria; o pedido pode acumular várias linhas de ajuste, sempre cobrindo apenas o intervalo entre a sua criação e a data de corte da regra correspondente.
- "Data no futuro" → cria a regra com `aplicar_em > now()`; um job (pg_cron) executa o ajuste na data marcada. Até lá, ninguém é tocado e novos pedidos usam o preço antigo.

## Itens técnicos (para o dev)

### Banco

Nova tabela `preco_mudancas`:
- `id`, `created_at`, `created_by`
- `tipo` enum: `ficha_variacao` | `custom_option`
- `target_id` uuid (id da variação ou opção)
- `target_label` text (snapshot do nome no momento)
- `categoria_slug` text, `campo_slug` text (snapshot p/ matching nos pedidos)
- `preco_antes` numeric, `preco_depois` numeric, `delta` numeric (depois - antes)
- `data_corte` timestamptz (pedidos com `created_at < data_corte` são ajustados)
- `aplicar_em` timestamptz null (se futuro, job roda nessa data)
- `escopo` text: `desde_inicio` | `data_especifica` | `futuro`
- `status` text: `pendente` | `aplicada` | `revertida`
- `pedidos_ajustados` integer, `valor_total_compensado` numeric
- `observacao` text

Nova tabela `preco_mudanca_aplicacoes` (1-para-N com pedidos):
- `id`, `mudanca_id`, `order_id`, `qtd_aplicada`, `valor_unit_delta`, `valor_total`, `created_at`

RLS: só `admin_master` lê/insere/atualiza/reverte.

Em `orders`, usar `extra_detalhes.ajustes_retroativos[]` (jsonb já existe) — sem nova coluna. O recálculo do total considera essa lista.

### Edge function `aplicar-mudanca-preco`

Input: `mudanca_id`.
- Busca pedidos elegíveis (criados antes de `data_corte`, contendo a variação no campo certo).
- Para cada pedido, conta `qtd_aplicada` (quantas vezes essa variação aparece × `quantidade` do pedido / botas no extra), calcula `valor_total_delta = -delta × qtd_aplicada` (negativo para preservar total quando preço sobe).
- Insere linha em `extra_detalhes.ajustes_retroativos`.
- Insere row em `preco_mudanca_aplicacoes`.
- Atualiza `pedidos_ajustados` e `valor_total_compensado` na `preco_mudancas`.
- Loga no `historico` do pedido.

### Job de futuro

`pg_cron` a cada hora roda função `aplicar_mudancas_futuras_pendentes()` que pega `preco_mudancas` com `escopo='futuro'`, `status='pendente'`, `aplicar_em <= now()` e chama a edge function (ou faz inline).

### Cálculo do total do pedido

`getOrderFinalValue` / `getOrderBaseValue` (já centralizado em mem) passa a somar `extra_detalhes.ajustes_retroativos[].valor_total`. Mesma coisa nos PDFs e na listagem. **Single source of truth** — sem duplicar lógica.

### Pontos de captura no UI

Toda chamada a `updateVariacao` (em `AdminConfigFichaPage.tsx` linhas 253, 1183, 1693 e similares) e a updates de `custom_options` deve passar por um wrapper `withPriceChangeGuard(oldPreco, newPreco, ctx)` que, se houver diferença, abre o dialog antes de fazer o update real. Só persiste depois da confirmação.

Bulk save (`AdminConfigFichaPage` "salvar todas") deve agrupar todas as diferenças num único dialog com lista, e gerar uma `preco_mudancas` por variação alterada (mesma `data_corte`).

### Memória

Salvar nova memory `features/admin/retroactive-price-change` descrevendo a regra: toda mudança de preço de variação/opção dispara dialog de escopo temporal + ajuste compensatório automático para preservar valor final dos pedidos já existentes.

## Perguntas antes de implementar

1. Quer travar algum status para não receber ajuste? Sugestão: `Cancelado` (não ajusta) e talvez `Entregue` se já foi cobrado. Ou ajustamos tudo e você controla pelo histórico?
2. Quando o pedido já tem desconto manual (`desconto` + `desconto_justificativa`), preferimos **somar** o ajuste retroativo ao desconto existente, ou **manter separado** em `extra_detalhes.ajustes_retroativos` e só somar no cálculo final (mantendo o desconto manual intacto para auditoria)? Recomendo separado.
3. Pedidos com status `Cobrado` / saldo já baixado do revendedor — também recalcular o saldo do revendedor para refletir o novo valor, ou congelar o financeiro e só ajustar pedidos ainda não cobrados?
