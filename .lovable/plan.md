## Remover ajuste_admin de R$ 36.848,15 da Maria Gabriela

**Alvo único:** movimento `ajuste_admin` de 09/05/2026 17:17, descrição "Ajuste histórico re-inserido (saldo anterior ao reset de 09/05)", valor R$ 36.848,15, vendedor Maria Gabriela.

### O que será feito

Migration SQL com um único `DELETE` em `revendedor_saldo_movimentos`, filtrando por:
- `vendedor = 'Maria Gabriela ...'` (nome completo exato)
- `tipo = 'ajuste_admin'`
- `valor = 36848.15`
- `descricao ILIKE '%Ajuste histórico re-inserido%'`

Uso de `LIMIT 1` via subquery por `id` para garantir que só 1 linha é removida (proteção contra duplicidade).

### O que NÃO será tocado

- Nenhum pedido em `orders`
- Nenhum comprovante em `revendedor_comprovantes`
- Nenhuma baixa em `revendedor_baixas_pedido`
- Nenhum outro movimento de saldo

### Efeito esperado

Saldo da Maria Gabriela cai exatamente R$ 36.848,15 (passa a refletir somente entradas reais de comprovantes que sobraram após sua limpeza manual).

### Detalhe técnico

A tabela tem policy que bloqueia `INSERT` direto, mas `DELETE` não tem policy (logo bloqueado por padrão para usuários). A migration roda com privilégios de owner, então o `DELETE` passa normalmente sem precisar alterar RLS.
