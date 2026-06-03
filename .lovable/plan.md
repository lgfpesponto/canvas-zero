## Objetivo
Endpoint público no portal para receber pedidos aprovados do `atacado.7estrivos.com.br` e gerar fichas de produção automaticamente, atribuídas a Juliana Cristina Ribeiro (cliente = `cliente_nome` do payload).

## Endpoint final

```
POST https://uxpcqqxlypshickabeyq.supabase.co/functions/v1/fichas-receber
Authorization: Bearer <ATACADO_INGEST_TOKEN>
Content-Type: application/json
```

## Regras (confirmadas)

- **Vendedor**: `Juliana Cristina Ribeiro` (user_id resolvido por `profiles.nome_completo` em runtime).
- **Cliente**: `pedido.cliente_nome` do payload.
- **Preço**: `preco_unitario` = valor do par. Cada pedido criado fica com `preco = preco_unitario`, `quantidade = 1`.
- **Numeração**: usa `${numero_pedido}${tamanho}` direto, sem prefixo `7E-`. Sufixo `A`, `B`, `C`… só quando o mesmo tamanho aparecer mais de uma vez no payload (entre fichas ou dentro da própria grade). Ex.: `001-38`, `001-38A`, `001-39`. Colisão com pedido existente no banco → `409`.
- **Grade** (`tipo: "grade"`): expande em N pedidos (um por par), seguindo o mesmo padrão do `addOrderBatch` atual.
- **Individual** (`tipo: "individual"`): 1 pedido único usando o campo `tamanho` do payload.
- **Status inicial**: `Em aberto`.
- **historico**: 1 entrada `"Pedido recebido via Atacado"` com `usuario = "Site Atacado"`, data/hora de Brasília.
- **dias_restantes**: 15.
- **Mapeamento dos campos**: `fichas[].ficha.*` (camelCase) → colunas da tabela `orders` (snake_case) 1:1. Campos ausentes ficam com valor padrão/null.
- **personalizacoes_residuais[]**: concatenadas em `observacao` (preservando a observação original) **e** também salvas em `extra_detalhes.personalizacoes_residuais` para auditoria. Aceito também o nome `personalizacoes` por compatibilidade.
- **ficha_snapshot**: salvo cru na coluna nova `orders.ficha_snapshot` (jsonb).
- **fotos**: `[foto_drive_url]` quando vier.
- **extra_detalhes**: também grava `origem: "atacado_site"`, `ficha_titulo` e `qr_code_url` para rastreio.

## Segurança

1. Validação Bearer com comparação constant-time. Falha → `401`.
2. Validação Zod do payload. Falha → `400` com detalhes.
3. `verify_jwt = false` em `supabase/config.toml` (rota pública).
4. Função usa `SUPABASE_SERVICE_ROLE_KEY` internamente (CORS aberto, mas só responde com o token correto).
5. Detecta duplicidade no banco antes de inserir → `409` com lista de números colidindo.
6. Secret `ATACADO_INGEST_TOKEN` — você cadastra valor (32+ chars, ex.: `openssl rand -hex 32`).

## Banco
- ✅ Migração já aplicada: coluna `orders.ficha_snapshot jsonb` (opcional, só para auditoria).
- Nenhum outro schema change.

## Arquivos a criar/editar
- **Novo**: `supabase/functions/fichas-receber/index.ts` — handler completo (Zod, planning, mapeamento, insert batch).
- **Editado**: `supabase/config.toml` — adicionar bloco `[functions.fichas-receber] verify_jwt = false`.
- **Secret novo**: `ATACADO_INGEST_TOKEN` — vou chamar `add_secret` pra você cadastrar o valor após implementar.

## Resposta da API
- Sucesso: `200 { ok: true, total: N, criados: [{ id, numero }, ...] }`
- Erros: `4xx/5xx { error: "mensagem" }` (sempre com CORS).

## Entregáveis no final
- URL completa (acima)
- Sugestão de token e prompt pra você cadastrar
- Exemplo de `curl` de teste
- Tabela de mapeamento `ficha.*` → coluna do portal

Confirma pra eu trocar pra modo build e implementar?