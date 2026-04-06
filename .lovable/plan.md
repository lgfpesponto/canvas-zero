

## Monitoramento de Armazenamento do Supabase

### Análise de viabilidade

**Problema principal:** A API client do Supabase (anon key) não expõe informações sobre uso de armazenamento do banco. Precisamos de uma edge function com service role key para consultar `pg_database_size()`.

**Sobre a limpeza:** A abordagem mais segura não é deletar pedidos, mas sim "podar" campos pesados de pedidos antigos (fotos, historico, alteracoes, extra_detalhes, campos de bordado, observações etc.), mantendo apenas: `id`, `numero`, `quantidade`, `vendedor`, `preco`, `data_criacao`, `status`, `cliente`, `tipo_extra`. Isso preserva a integridade referencial e os gráficos de vendas.

**Riscos identificados e mitigações:**
- Pedidos podados perdem detalhes permanentemente — mitigação: confirmação dupla + aviso claro
- Pedidos em produção não devem ser podados — mitigação: só podar pedidos com status "Entregue" ou "Cobrado" com mais de 90 dias
- A tabela `deleted_orders` também deve ser limpa (order_data jsonb é pesado)

---

### 1. Edge Function `storage-info`

Criar `supabase/functions/storage-info/index.ts`:
- Valida JWT e verifica role admin via service role key
- Consulta `SELECT pg_database_size(current_database())` para obter tamanho do DB
- Consulta `SELECT count(*) FROM orders` para dar contexto
- Retorna: `{ db_size_bytes, db_size_mb, order_count, limit_mb: 500 }`

### 2. Edge Function `cleanup-old-orders`

Criar `supabase/functions/cleanup-old-orders/index.ts`:
- Valida JWT e verifica role admin
- Atualiza pedidos com status 'Entregue' ou 'Cobrado' criados há mais de 90 dias:
  - Limpa campos: `fotos='[]'`, `historico='[]'`, `alteracoes='[]'`, `extra_detalhes=null`, `observacao=''`, campos de bordado/couro desc = null, `sob_medida_desc=null`, etc.
  - Mantém: `id`, `numero`, `quantidade`, `vendedor`, `preco`, `adicional_valor`, `data_criacao`, `hora_criacao`, `status`, `cliente`, `tipo_extra`, `modelo`, `tamanho`
- Também limpa registros `dismissed=true` da tabela `deleted_orders`
- Retorna: `{ orders_cleaned, deleted_orders_removed, freed_estimate_mb }`

### 3. Painel no Dashboard (Index.tsx)

Apenas para Juliana (7estrivos):

- Novo card "Armazenamento Supabase" com:
  - Barra de progresso mostrando uso (ex: "245 MB / 500 MB")
  - Ícone de alerta se uso > 80%
  - Contagem de pedidos no banco
  - Botão "Limpar dados antigos"

- Ao clicar em "Limpar":
  - AlertDialog com confirmação: "Tem certeza? Pedidos entregues há mais de 90 dias terão seus detalhes removidos permanentemente. Apenas número, vendedor, quantidade e valor serão mantidos."
  - Após confirmar, chama a edge function `cleanup-old-orders`
  - Mostra toast com resultado

### 4. Banner de aviso no topo (Header.tsx)

- Quando uso > 80% do limite (400MB de 500MB):
  - Banner amarelo fixo acima do header: "⚠ Armazenamento próximo do limite (X%). Acesse o dashboard para limpar dados antigos."
  - Visível apenas para Juliana
  - O dado de storage é buscado uma vez por sessão e armazenado em context/state

### Fluxo de dados

```text
Header.tsx ──────────────────────────────────────────────────
  │ (se > 80%) Banner amarelo de aviso                      
  └──────────────────────────────────────────────────────────
Index.tsx (Dashboard Juliana)                                 
  │                                                          
  ├─ useEffect → invoke('storage-info') → { db_size_mb, limit_mb }
  │                                                          
  ├─ Card com Progress bar + contagem                        
  │                                                          
  └─ Botão Limpar → AlertDialog → invoke('cleanup-old-orders')
```

### Arquivos alterados/criados

| Arquivo | O que muda |
|---------|-----------|
| `supabase/functions/storage-info/index.ts` | Nova edge function para consultar tamanho do DB |
| `supabase/functions/cleanup-old-orders/index.ts` | Nova edge function para podar pedidos antigos |
| `src/pages/Index.tsx` | Card de armazenamento no dashboard Juliana + botão limpar |
| `src/components/Header.tsx` | Banner de aviso quando armazenamento > 80% |

