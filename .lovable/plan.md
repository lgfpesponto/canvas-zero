

## Plano: Excluir vendedor "Estoque" do grafico de vendas

### O que muda

O grafico "Quantidade de vendas" no dashboard do admin_master atualmente inclui pedidos do vendedor "Estoque". Esses pedidos sao internos e nao devem contar como vendas.

### Implementacao

**Arquivo unico**: Nova migration SQL

Recriar a funcao `get_sales_chart` adicionando um filtro na CTE `filtered`:

```sql
AND o.vendedor <> 'Estoque'
```

Isso sera adicionado na clausula WHERE junto aos filtros existentes (prefixos excluidos, produto, vendedor). A linha fica logo apos o filtro de `excluded_prefixes`.

Nenhuma alteracao no frontend e necessaria -- o filtro e aplicado no servidor.

