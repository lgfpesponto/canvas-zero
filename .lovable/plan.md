
# Módulo NF-e — Fase 1 (Emissão direta SEFAZ)

Implementação da base do módulo de NF-e modelo 55, exatamente como o pacote enviado, com acesso restrito a **Igor** e **Stefany ADM** (além de admin_master Juliana, por segurança/manutenção).

## ⚠️ Importante antes de aprovar

1. **Isto é só Fase 1.** Esta fase entrega: cadastro do emitente, upload do certificado A1 (.pfx), edição de tributação por referência, e botão de teste de conexão SEFAZ (status do serviço). **Não emite NF-e ainda** — emissão real (assinatura XML, autorização, DANFE) é Fase 2 e depende de bibliotecas adicionais (`node-forge`, `xml-crypto`, `pdf-lib`).
2. **A tabela `referencias` não existe neste projeto.** O pacote original assume um catálogo de referências/produtos. Aqui os produtos vivem em `ficha_variacoes` + `custom_options`. **Decisão:** vou criar uma tabela nova `nfe_tributacao_referencias` (mapa código fiscal ↔ rótulo livre) que o usuário preenche manualmente — assim não acoplamos NF-e ao schema de pedidos agora. Se preferir mapear direto em `ficha_variacoes`/`custom_options`, me avise.
3. **Tabela `pedidos` também não existe** (aqui é `orders`). Vou ajustar a FK de `nfe_notas.pedido_id` para `public.orders(id)`.
4. **Secret necessária:** `NFE_CERT_PASSWORD` (senha do .pfx). Vou pedir depois que o esquema estiver aprovado.

## Quem terá acesso

- `admin_master` (Juliana) — sempre.
- Usuários `Igor` e `Stefany ADM` (match por `nome_completo` em `profiles`).
- Demais usuários: rota retorna `Navigate to "/"`.

## Entregáveis Fase 1

### 1. Migration de schema (`supabase--migration`)
- `nfe_config` (1 linha — config do emitente) com GRANTs + RLS (apenas admin_master + Igor/Stefany via policy baseada em `nome_completo`).
- `nfe_notas`, `nfe_itens`, `nfe_eventos` (estrutura preparada para Fase 2, mas já com RLS).
- `nfe_tributacao_referencias` (id, rotulo, ncm, cest, cfop_padrao, unidade, origem, cst_icms/pis/cofins, aliq_icms/pis/cofins).
- Bucket privado `nfe-certificados` + policies.

### 2. Helper de acesso
- `src/hooks/useNfeAccess.ts` — retorna `true` para admin_master OU `nome_completo` ∈ {`Igor`, `Stefany ADM`}.

### 3. Páginas React
- `src/pages/ConfiguracoesNFe.tsx` (copiado/adaptado do anexo).
- `src/pages/ConfiguracoesTributacao.tsx` (adaptado para `nfe_tributacao_referencias`).
- Ambas com gate via `useNfeAccess` (redirect para `/` se não autorizado).

### 4. Rotas em `App.tsx`
- `/configuracoes/nfe` → `ConfiguracoesNFe`
- `/configuracoes/tributacao` → `ConfiguracoesTributacao`

### 5. Link no menu
- Botão "NF-e" no `Header.tsx`, visível **apenas** para usuários com `useNfeAccess`.

### 6. Edge function `nfe-status-servico`
- Copiada do anexo, com correção: `corsHeaders` em `'../_shared/cors.ts'` ou inline (o `npm:@supabase/supabase-js@2/cors` do anexo não existe). Vou usar headers CORS inline padrão Lovable.
- Para Fase 1 sem `node-forge`, o mTLS real com o .pfx ainda não vai funcionar — o botão "Testar SEFAZ" retornará a resposta SOAP sem cliente certificado, o que **vai falhar contra o endpoint real**. Vou deixar isso explícito no toast com mensagem clara ("Teste real exige Fase 2 — assinatura/mTLS").

### 7. Secret
- Após approvar a migration, peço `NFE_CERT_PASSWORD`.

## Fora de escopo (Fase 2, requer aprovação separada)
- Assinatura XML (RSA-SHA1 + C14N) com `node-forge` + `xml-crypto`.
- Emissão real (`NFeAutorizacao4`), consulta retorno, cancelamento, inutilização.
- Geração de DANFE PDF.
- Vínculo NF-e ↔ pedido na tela de detalhes do pedido.
- Numeração atômica via `UPDATE ... RETURNING` em `proximo_numero`.

## Próximo passo
Aprovar este plano → eu rodo a migration (você revisa o SQL antes de executar) → depois eu crio páginas + edge function + peço a secret.

Confirma com "ok" para eu começar pela migration?
