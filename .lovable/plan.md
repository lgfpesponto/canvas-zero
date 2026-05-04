# Atualização de Prazos e Regras de Produção

## 1. Novos prazos (lead times)

Atualizar `getTotalBizDays` em `src/lib/orderDeadline.ts` para refletir:

| Tipo | Dias úteis |
|---|---|
| Bota (ficha) | 20 |
| Cinto | 20 |
| Tiras laterais | 2 |
| Desmanchar | 7 |
| Gravata Country | 7 |
| Kit Canivete | 4 |
| Kit Faca | 4 |
| Carimbo a Fogo | 5 (ou vinculado a bota — ver §4) |
| Revitalizador | 1 |
| Kit Revitalizador | 1 |
| Adicionar Metais | 7 |
| Chaveiro c/ Carimbo | 5 |
| Bainha de Cartão | 7 |
| Regata Encomenda | 20 |
| Regata Pronta Entrega (novo) | 1 |
| Bota Pronta Entrega | 1 (+ extras anexos — ver §5) |
| Gravata Pronta Entrega | 1 |

Aplicar automaticamente a todos pedidos existentes — como o prazo é calculado em runtime a partir de `tipoExtra` + `dataCriacao`, basta a alteração no código. Pedidos já em etapa final (Expedição em diante / Cancelado) continuam exibindo "✓" e não são afetados (lógica atual de `FINAL_STAGES` já cobre).

## 2. Regra de horário de corte (cutoff)

Em `getOrderDeadlineInfo`/`parseCreatedDate`:

- **Extras**: pedidos criados **após 12:00** passam a contar o prazo a partir do próximo dia útil (o dia da criação não conta como D1).
- **Ficha de Produção (bota e cinto)**: cutoff **06:00**.
- Pedidos criados antes do cutoff em dia útil mantêm o dia da criação como D1 (comportamento atual).
- Sábado/domingo/feriado: o "primeiro dia útil" continua sendo o próximo dia útil real.

Implementação: ao calcular o deadline, se a hora de criação > cutoff do tipo, deslocar a `startDate` para o próximo dia útil às 00:00 antes de chamar `addBusinessDays`.

Cutoff por tipo:
```
bota/cinto → 06:00
qualquer extra → 12:00
```

## 3. Criar extra "Regata Pronta Entrega"

Espelhar o funcionamento de `gravata_pronta_entrega`:

- Adicionar `regata_pronta_entrega` em `EXTRA_PRODUCTS` (`src/lib/extrasConfig.ts`).
- Nova tabela `regata_stock` (mesmo schema de `gravata_stock`, adaptado: `cor`, `tamanho`, `quantidade`) + RPC `decrement_regata_stock`.
- RLS: leitura por autenticados, escrita por admins, delete só `admin_master`.
- Tela `ExtrasPage` e `EditExtrasPage`: novo bloco igual ao de gravata, com seleção de item de estoque + decremento ao salvar.
- Admin: card de gestão de estoque na lista de produtos, igual ao da gravata.
- Lead time: 1 dia útil.
- Preço: definir com o usuário no momento de criar o estoque (mesmo padrão da gravata) — usar `precoBase` placeholder R$ 50 (ajustável).

## 4. Carimbo a Fogo vinculado a bota por encomenda

Em `ExtrasPage` / `EditExtrasPage`, no formulário do `carimbo_fogo`:

- Novo checkbox "Vai com bota por encomenda?".
- Se sim, exibir seletor de pedido (mesmo `numeroPedidoBotaVinculo` já existente) — agora obrigatório nesse caminho — e gravar flag `vinculadoBota: true` em `extra_detalhes`.
- Cálculo de prazo (em `getOrderDeadlineInfo`): quando o pedido for `carimbo_fogo` com `vinculadoBota`, o prazo passa a contar a partir da data/hora em que a bota vinculada entrou em "Revisão" (primeira ocorrência no `historico` da bota). Se a bota ainda não chegou em Revisão/Expedição, exibir prazo "—" com tom `muted` e label "Aguardando bota".
- Para isso, `getOrderDeadlineInfo` precisa receber também o pedido vinculado (ou apenas o histórico dele). Ajustar callers principais (OrderCard, OrderDetailPage, listas) para passar a bota correlata via lookup por `numero_pedido_bota`/`numeroPedidoBotaVinculo`.

## 5. Bota Pronta Entrega com extras anexos

Hoje `bota_pronta_entrega` tem prazo fixo 1 dia útil. Nova regra: se o pedido tiver outros extras anexos (campo a definir; usar o array `extra_detalhes.extrasAnexos: string[]` com ids como `tiras_laterais`, `carimbo_fogo`, etc.), somar o maior prazo dos extras anexos a 1 dia útil.

- Em `ExtrasPage`/`EditExtrasPage`, no bloco `bota_pronta_entrega`, adicionar seleção múltipla "Vai com algum extra?" listando os extras suportados.
- `getTotalBizDays` para `bota_pronta_entrega`: `1 + max(prazo dos anexos)` (0 se nenhum).
- Exibir os extras anexos no detalhe e nos PDFs (apenas como linha informativa).

## 6. Migração / dados existentes

- Não há mudança de schema em `orders` — os prazos são derivados.
- Migrações novas:
  1. Criar `regata_stock` + função `decrement_regata_stock`.
- Pedidos já finalizados (etapa final) não são afetados pela mudança visual graças ao `isFinal`. Pedidos em produção passarão automaticamente a exibir o novo prazo recalculado; isso é o comportamento desejado pelo usuário.

## Arquivos a alterar

```text
src/lib/orderDeadline.ts        // lead times + cutoff + carimbo vinculado + bota PE com anexos
src/lib/extrasConfig.ts         // novo regata_pronta_entrega + labels
src/pages/ExtrasPage.tsx        // UI regata PE, checkbox carimbo+bota, anexos da bota PE
src/pages/EditExtrasPage.tsx    // mesmas alterações de edição
src/components/OrderCard.tsx    // passar bota vinculada ao deadline (carimbo)
src/pages/OrderDetailPage.tsx   // idem + exibir anexos da bota PE
supabase/migrations/*.sql       // tabela regata_stock + RPC + RLS
```

## Perguntas em aberto (responder antes de implementar)

1. **Regata Pronta Entrega**: o estoque deve ter os mesmos campos da gravata (cor da tira, tipo metal, cor brilho) ou outros (ex.: cor + tamanho)? Preço fixo de quanto?
2. **Bota PE + extras**: a seleção de extras anexos deve abrir os campos completos de cada extra (ex.: descrição do carimbo) ou só registrar o tipo para fins de prazo?
3. **Carimbo vinculado a bota**: enquanto a bota não chega em Revisão, o pedido de carimbo conta como "atrasado" ou fica neutro ("Aguardando bota")? Plano atual: neutro.
