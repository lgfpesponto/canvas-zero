## Ajustes finais aceitos

### 1. Numeração (alinhada com botão "gerar grade")

Formato: `${numero_pedido}${tamanho}${seq2}` — exatamente como o `GradeEstoque.tsx` já gera (`seq2` = 01, 02, 03… com `padStart(2,'0')`).

- `numero_pedido` vem **pronto** do site atacado, já com prefixo `AT` e, quando o pedido tem múltiplas fichas, já com sufixo `A`/`B`/`C` na própria string. A função **não adiciona nem remove nada** desse campo.
- Sequencial reinicia em `01` **por tamanho dentro da ficha** (idêntico ao comportamento da grade atual).
- Individual = grade de 1 par → vira `${numero_pedido}${tamanho}01`.

Exemplos validados:
- AT008 individual tam 38 → `AT0083801`
- AT008 grade 3×36 → `AT0083601`, `AT0083602`, `AT0083603`
- AT008B grade 2×39 → `AT008B3901`, `AT008B3902`

### 2. Duplicidade
`SELECT numero FROM orders WHERE numero IN (...)` antes do insert. Qualquer colisão → `409` com a lista (protege contra reenvio acidental do mesmo pedido).

### Tudo o mais aprovado (sem mudar)
- Vendedor: Juliana Cristina Ribeiro · Cliente: `pedido.cliente_nome`
- `preco = preco_unitario` por par · `quantidade = 1`
- Status: `Em aberto` · `dias_restantes = 15` · histórico `"Pedido recebido via Atacado"`
- Mapeamento 1:1 `fichas[].ficha.*` (camelCase) → coluna `orders.*` (snake_case)
- `personalizacoes_residuais[]` → concatena em `observacao` e salva em `extra_detalhes.personalizacoes_residuais`
- `ficha_snapshot` cru → coluna `orders.ficha_snapshot` (jsonb, já migrada)
- `extra_detalhes` adicional: `origem: "atacado_site"`, `ficha_titulo`, `qr_code_url`
- Bearer constant-time + Zod + `verify_jwt=false` + `SUPABASE_SERVICE_ROLE_KEY`

### Arquivos
- **Novo**: `supabase/functions/fichas-receber/index.ts` (já escrito, vou ajustar só `buildPlannedRows`)
- **Edit**: `supabase/config.toml` (bloco `[functions.fichas-receber] verify_jwt = false`)
- **Secret**: `ATACADO_INGEST_TOKEN`

### Entregáveis ao final
1. URL: `https://uxpcqqxlypshickabeyq.supabase.co/functions/v1/fichas-receber`
2. Token gerado com `openssl rand -hex 32` (vou te mostrar e abrir o prompt do secret)
3. `curl` de teste pronto
4. Você cadastra o token e a gente dispara um pedido real

Confirma pra eu trocar pra build e finalizar?