

## Correção do gráfico semanal — semanas domingo a sábado com faixa de datas

### Problema atual

A função `get_sales_chart` no modo "semana":
1. Usa `generate_series(current_date - 27, current_date, '7 days')` — gera apenas 4 pontos e não alinha aos domingos
2. Março 2025 teve 5 semanas (começou no sábado), então o sistema perde semanas
3. O label `CEIL(DAY/7)/MONTH` não funciona bem para semanas que cruzam meses

### Solução

Reescrever o bloco "semana" da função SQL para:

1. **Alinhar ao domingo**: calcular o domingo da semana atual com `date_trunc('week', current_date + 1) - 1` (PostgreSQL usa segunda como início de semana ISO, então ajustamos)
2. **Gerar 6 semanas para trás**: `generate_series` de 5 semanas antes até a semana atual, intervalo de 7 dias, cada ponto sendo o domingo daquela semana
3. **Label como faixa de datas**: formato `DD/MM–DD/MM` (domingo a sábado), ex: `30/03–05/04`
4. **JOIN correto**: cada pedido cai na semana cujo domingo <= data_criacao <= sábado (domingo + 6)

### Alteração SQL (migration)

```sql
-- Para o CASE do generate_series (início):
WHEN 'semana' THEN (date_trunc('week', current_date + 1) - interval '5 weeks')::date - 1

-- Para o label:
WHEN 'semana' THEN to_char(d.dt, 'DD/MM') || '–' || to_char(d.dt + 6, 'DD/MM')

-- Para o JOIN:
WHEN 'semana' THEN f.data_criacao::date BETWEEN d.dt AND d.dt + 6
```

Onde `d.dt` é sempre um domingo. Isso gera 6 pontos de dados cobrindo as últimas 6 semanas, com labels legíveis como `30/03–05/04`.

### Resumo

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | Atualizar `get_sales_chart` — bloco semana com alinhamento domingo-sábado e labels de faixa |

Nenhuma mudança no frontend necessária — os labels já são renderizados como string pelo gráfico.

