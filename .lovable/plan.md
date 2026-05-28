## Problema

Relatório mostra **R$ 354.290,20** (com preços congelados antigos), mas a soma real dos pedidos pela composição atual é **R$ 352.738,80**. Há R$ 1.551,40 de diferença vindos de pedidos marcados `preco_congelado = true` pelo Ajuste Retroativo, que ficam imunes ao recálculo.

Decisão: **desligar definitivamente o congelamento de preço**. Todo pedido deve sempre refletir o preço calculado a partir da composição atual (modelo + bordado + extras), exceto pedidos com status `Cancelado` (que já têm snapshot próprio).

## O que muda

### 1. Descongelar todos os pedidos existentes (migration)
- `UPDATE orders SET preco_congelado = false WHERE preco_congelado = true`
- `ALTER COLUMN preco_congelado SET DEFAULT false`
- Roda recálculo em massa via trigger existente (ou marca `preco_migrado_v2 = false` para forçar reprocessamento pelo runner do admin / reconciliar-precos).

### 2. Remover guarda de congelamento no recálculo
- `src/lib/recomputePricesBatch.ts` linha 41-44: remover o `if (precoCongelado === true) return;`.
- `supabase/functions/reconciliar-precos/index.ts` linhas 398 e 439: remover `.eq('preco_congelado', false)` para que todos pedidos sejam reconciliados.
- Trigger SQL `20260520022601` (estorno automático): remover o bloco `IF NEW.preco_congelado = true THEN RETURN;` para voltar a estornar normalmente.

### 3. Remover UI do Ajuste Retroativo
- `src/components/admin/PriceChangeDialog.tsx`: o dialog que pergunta "desde início / data / futuro" e chama `aplicar_mudanca_preco` deixa de fazer sentido. Substituir por aplicação direta da mudança (sempre futuro = recalcula tudo), ou simplesmente remover o dialog e salvar o preço sem confirmação extra.
- `src/lib/priceChangeGuard.ts`: simplificar para apenas salvar a mudança de preço e disparar recálculo de todos pedidos afetados (sem opção "congelar antigos").

### 4. Limpar flags no domínio
- Manter coluna `preco_congelado` no banco (para histórico), mas sempre `false`. Não removo a coluna agora para evitar quebrar migrations antigas.
- `src/lib/order-logic.ts`: manter mapeamento `precoCongelado` para não quebrar tipos, mas todos os call-sites já passam `false`.

### 5. Atualizar memória
- Reescrever `mem://features/admin/retroactive-price-change` marcando como REMOVIDO.
- Reescrever `mem://features/orders/preco-congelado-removed` removendo o aviso de "DESATUALIZADO" — voltou a estar correto: não há mais congelamento.

## Validação

1. Após migration, `SELECT SUM(preco) FROM orders WHERE preco_congelado = true` retorna 0.
2. Relatório com filtros atuais (1191 produtos, Conferido=Sim) bate com a soma manual da composição (≈ R$ 352.738,80).
3. Salvar nova mudança de preço de uma variação não oferece mais a pergunta "desde quando" e recalcula todos pedidos abertos.
4. Botão "Recalcular preços" no admin processa 100% dos pedidos (nenhum pulado por congelamento).

## Arquivos alterados

- Nova migration: descongelar + alterar default + forçar recálculo.
- `src/lib/recomputePricesBatch.ts`
- `supabase/functions/reconciliar-precos/index.ts`
- `src/components/admin/PriceChangeDialog.tsx` (simplificar ou substituir)
- `src/lib/priceChangeGuard.ts`
- Memórias relacionadas

## Risco / Observação

O Ajuste Retroativo foi reintroduzido em 22/05/2026 justamente para preservar pedidos antigos quando o preço de uma variação muda no meio do mês. Se a nova regra for "preço sempre = composição atual", qualquer mudança futura de tabela vai reescrever o histórico financeiro. Confirma que é isso mesmo que você quer? Se sim, sigo com o plano acima.