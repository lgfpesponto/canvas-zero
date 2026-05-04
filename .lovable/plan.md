## Problema

O portal trava no login com a mensagem **"O servidor demorou demais para responder"** porque o cliente Supabase está apontando para o domínio personalizado `https://api.7estrivos.com.br`, e esse host está **fora do ar** no momento.

Teste de conectividade feito agora:

```text
api.7estrivos.com.br/auth/v1/health        →  TIMEOUT após 10s (0 bytes)
uxpcqqxlypshickabeyq.supabase.co/auth/v1/health  →  HTTP 401 em 66ms ✅
```

O painel de rede do preview confirma dezenas de `Failed to fetch` contra `api.7estrivos.com.br`. O `AuthContext` tem um timeout interno de 15s no `signInWithPassword`, daí a mensagem amigável aparecer pra Stefany.

## Causa provável

O domínio personalizado `api.7estrivos.com.br` (configurado no Supabase como custom domain) foi removido, expirou, ou perdeu o CNAME no DNS. O `.env` do projeto já usa o host padrão correto (`uxpcqqxlypshickabeyq.supabase.co`), mas o arquivo `src/integrations/supabase/client.ts` foi codado em hard-code para o custom domain.

## Correção

### 1. `src/integrations/supabase/client.ts`
Trocar a constante `SUPABASE_URL` para usar o host padrão da Supabase, igual ao que está no `.env`:

```ts
const SUPABASE_URL = "https://uxpcqqxlypshickabeyq.supabase.co";
```

Isso restabelece imediatamente login, leitura de pedidos, edge functions, realtime de presença, sino de notificações etc. Nada mais precisa mudar no código — a anon key continua a mesma.

### 2. (Opcional, recomendado depois) Reativar o custom domain
Quando o `api.7estrivos.com.br` voltar a funcionar (ajuste de DNS / renovação no painel Supabase), basta reverter essa linha. Enquanto isso, o portal funciona normalmente pelo host padrão.

## Arquivos alterados

- `src/integrations/supabase/client.ts` — 1 linha

## Fora do escopo

- Diagnóstico DNS / configuração do custom domain (precisa ser feito no painel da Supabase + DNS do domínio, fora do código)
- Nenhuma alteração de banco, RLS ou edge function é necessária
