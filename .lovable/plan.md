## Objetivo

No card de cada revendedor (aba Saldo Revendedor), quando o saldo disponível não cobrir os pedidos cobrados sem baixa, exibir o **valor que falta** em destaque vermelho — ex.: Denise tem R$ 335 de saldo e R$ 380 pendentes → mostrar `Falta -R$ 45,00`.

## Mudança

Arquivo único: `src/components/financeiro/saldo/FinanceiroSaldoRevendedor.tsx` (bloco do card, linhas 421-428).

Cálculo:
```
falta = saldo - pendValor   // só exibe quando pendQtd > 0 e falta < 0
```

## Layout proposto

Logo abaixo da linha amarela "X pedido(s) sem baixa | R$ pendValor", adicionar uma linha extra **somente quando `falta < 0`**:

```
─────────────────────────────
⚠ 1 pedido(s) sem baixa        R$ 380,00
Falta                          -R$ 45,00     ← vermelho/destructive, bold
```

Quando `falta >= 0` (saldo cobre tudo), nada novo aparece — a baixa automática resolveria sozinha.

## Detalhes técnicos

- Usar `text-destructive font-semibold` na linha "Falta" para destacar.
- `formatCurrency(falta)` já devolve sinal negativo.
- Nenhuma mudança em backend, RPC, ou lógica de baixa — puramente visual.
