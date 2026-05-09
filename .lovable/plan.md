## Comportamento atual

- `tentar_baixa_automatica` no banco já mantém o pedido **não baixado** quando saldo < preço (faz `EXIT` do loop).
- Na UI (`FinanceiroSaldoRevendedor`), a coluna **Saldo disponível** e o card **Saldo disponível total** mostram apenas `vw_revendedor_saldo.saldo_disponivel`, que nunca fica negativo. Existe hoje só um aviso lateral textual com "a quitar".

## Mudança (frontend only — nenhuma alteração de banco/baixa)

Em `src/components/financeiro/saldo/FinanceiroSaldoRevendedor.tsx`:

1. **Calcular saldo efetivo por vendedor** = `saldo_disponivel − pendencias[vendedor].valor` (pendências = pedidos `Cobrado` sem baixa, já carregadas em `pendencias`).

2. **Card "Saldo disponível"** (topo, `totals.saldoSnapshot`):
   - Somar `(saldo_disponivel − pendencias.valor)` no escopo filtrado em vez de só `saldo_disponivel`.
   - Quando o resultado for negativo: aplicar classe `text-destructive` (vermelho) em vez de `text-primary`.
   - Trocar a legenda "saldo atual (cumulativo)" por "negativo = falta para quitar pedidos cobrados" quando estiver negativo.

3. **Tabela "Saldo por vendedor"**:
   - Renomear coluna para **"Saldo"**.
   - Mostrar `saldoEfetivo = saldo_disponivel − pendencias[vendedor].valor`.
   - Estilizar negativo em `text-destructive`, positivo continua em `text-primary`.
   - Reordenar a lista por `saldoEfetivo` decrescente.

4. **`saldoFiltrado`** (passado para `ComprovantesPorRevendedor` como `saldoVendedor`): manter o objeto original do banco intacto (não mexer — esse componente usa o saldo bruto para outras contas).

5. Manter o aviso amarelo já existente sobre pedidos a quitar — continua útil para detalhar quantos pedidos.

## Não muda

- Banco, RPC `tentar_baixa_automatica`, view `vw_revendedor_saldo`, RLS — tudo igual.
- Comprovantes, baixas, estornos — comportamento idêntico.
- O pedido `Cobrado` continua **não recebendo baixa** automática enquanto faltar saldo (regra atual já atende isso).