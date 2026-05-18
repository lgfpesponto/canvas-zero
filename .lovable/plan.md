## Situação atual da Maria Gabriela

- **Saldo atual:** R$ 432.015,07
- **Utilizado:** R$ 0,00 (zerado na migration anterior)
- **Meta:** R$ 350.763,40
- **Excesso a remover:** **R$ 81.251,67**

## Resumo por data

| Data | Tipo | Qtd | Total |
|---|---|---:|---:|
| 27/04 | entrada_comprovante (backfill) | 33 | R$ 253.202,12 |
| 09/05 | entrada_comprovante (admin) | 4 | R$ 47.049,20 |
| 09/05 | **ajuste_admin** "histórico re-inserido" | 1 | R$ 36.848,15 |
| 12/05 | entrada_comprovante | 2 | R$ 28.043,80 |
| 14/05 | entrada_comprovante | 2 | R$ 21.076,60 |
| 18/05 | entrada_comprovante | 6 | R$ 45.795,20 |
| **Total** | | **48** | **R$ 432.015,07** |

## Lista completa (48 entradas)

### 27/04 — backfill (33 lançamentos — R$ 253.202,12)
6.373 · 2.000 · 1.627 · 10.521,72 · 8.000 · 10.000 · 1.900,60 · 840 · 4.340 · 6.500 · 5.500 · 4.300 · 5.700 · 13.757 · 15.000 · 2.261,80 · 15.000 · 15.067 · 4.765,60 · 16.469,80 · 1.000 · 7.000 · 10.348,40 · 6.154,80 · 3.000 · 10.000 · 10.000 · 8.225 · 11.684,40 · 10.000 · 9.156,20 · 1.880 · 14.829,80

### 09/05 — admin (4 lançamentos — R$ 47.049,20)
- 15:28 — 16.132,20 — Pix | Transferência
- 15:28 — 7.211,60 — Pix | Transferência
- 15:28 — 13.705,40 — Pix | Transferência
- 15:28 — 10.000,00 — Comprovante de transferência Pix

### 09/05 — ajuste_admin (1 lançamento — R$ 36.848,15)
- 17:17 — **R$ 36.848,15** — "Ajuste histórico re-inserido (saldo anterior ao reset de 09/05)"

### 12/05 — entrada_comprovante (2 — R$ 28.043,80)
- 14.245,00
- 13.798,80

### 14/05 — entrada_comprovante (2 — R$ 21.076,60)
- 10.000,00
- 11.076,60

### 18/05 — entrada_comprovante (6 — R$ 45.795,20)
- 6.500,00
- 9.156,20
- 8.225,00
- 11.684,40
- 1.880,00
- 8.349,60

## Combinação sugerida (exata = R$ 81.251,67)

1. **R$ 36.848,15** — `ajuste_admin` de 09/05 ("Ajuste histórico re-inserido")
2. **R$ 44.403,52** restantes → precisa indicação sua de quais entradas remover (nenhuma combinação óbvia fecha exatamente esse valor sozinha)

## O que preciso de você

Me confirme **uma** das opções:

- **(1)** Apago o `ajuste_admin` de R$ 36.848,15 e você me lista exatamente quais entradas devo apagar para somar os R$ 44.403,52 restantes (data + valor).
- **(2)** Você me diz outro número-alvo para "Recebido" (ex.: se R$ 350.763,40 já incluía considerar o ajuste fora, talvez o alvo verdadeiro seja outro).
- **(3)** Eu deleto somente o `ajuste_admin` (R$ 36.848,15) e o saldo fica em R$ 395.166,92 (mais próximo possível sem mexer em comprovantes reais).

Após sua escolha, gero a migration de DELETE correspondente — nenhum pedido em `orders` é tocado.
