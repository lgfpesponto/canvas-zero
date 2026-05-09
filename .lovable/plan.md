## Histórico do saldo da Maria Gabriela hoje

| Momento | Recebido | Utilizado | Ajuste | Saldo |
|---|---|---|---|---|
| Antes do reset (16:59) | 300.251,32 | 81.251,67 | +36.848,15 | **255.847,80** |
| Após o reset (17:02) | 300.251,32 | 0 | 0 | 300.251,32 |
| Agora (17:08) | 300.251,32 | 81.251,67 | 0 | **218.999,65** |

O "244 mil" que você lembra não existe registrado. O valor original mais próximo era **R$ 255.847,80**.

## Proposta

Re-inserir o **ajuste_admin de +R$ 36.848,15** que existia antes (foi removido no reset). Com o utilizado já em R$ 81.251,67, o saldo vai voltar para os **R$ 255.847,80** originais.

### Mudança

Inserir 1 movimento em `revendedor_saldo_movimentos`:

- `vendedor`: "Maria Gabriela"
- `tipo`: `ajuste_admin`
- `valor`: 36848.15
- `descricao`: "Ajuste histórico re-inserido (saldo anterior ao reset de 09/05)"
- `saldo_anterior`: 218999.65
- `saldo_posterior`: 255847.80

Via migração (RLS bloqueia INSERT direto).

### Resultado esperado

| Vendedora | Recebido | Utilizado | Ajuste | Saldo |
|---|---|---|---|---|
| Maria Gabriela | 300.251,32 | 81.251,67 | +36.848,15 | **255.847,80** |
| Rafael Silva | 11.400,00 | 0 | 0 | 11.400,00 |
| Denise Garcia Feliciano | 3.415,00 | 0 | 0 | 3.415,00 |

### Importante

Se você quiser **outro valor exato** (244.000,00 ou outro), me diga — eu ajusto o valor do ajuste para chegar no número que você quer. Mas o registro histórico aponta R$ 255.847,80.