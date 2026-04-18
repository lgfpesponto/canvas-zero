

## Contexto

Build error é transitório (Cloudflare R2 timeout no upload do bundle anterior, nada a ver com nosso código). Ignora — próximo build resolve.

Usuário aprovou. Worker em `api.7estrivos.com.br` está respondendo (o JSON `"No API key found"` confirma que o proxy funciona). Agora trocar a URL no app pra apontar pro proxy.

## Mudanças

### 1. `src/integrations/supabase/client.ts`
Trocar a constante `SUPABASE_URL`:
- De: `"https://uxpcqqxlypshickabeyq.supabase.co"`
- Para: `"https://api.7estrivos.com.br"`

`SUPABASE_PUBLISHABLE_KEY` fica idêntica (a chave é a mesma do projeto, só muda o endereço de entrada).

### 2. `.env`
Trocar `VITE_SUPABASE_URL`:
- De: `"https://uxpcqqxlypshickabeyq.supabase.co"`
- Para: `"https://api.7estrivos.com.br"`

Mantenho `SUPABASE_URL` (sem prefixo VITE) apontando pro original — essa é usada server-side (edge functions) e não vaza pro navegador da vendedora.

### 3. Verificação
Buscar no `src/` por qualquer outra referência hardcoded a `uxpcqqxlypshickabeyq.supabase.co`. Se achar (em algum hook, PDF generator, fetch direto), troco também. Provavelmente nada — o padrão é importar de `@/integrations/supabase/client`.

## O que NÃO mexo

- `src/integrations/supabase/types.ts` — gerado automaticamente, proibido editar
- `supabase/functions/*` — rodam server-side dentro do Supabase, usam env vars internas
- `supabase/config.toml` — config do projeto Supabase
- Banco de dados — zero alteração, zero risco de perda de dados

## Validação (você faz depois)

1. Abrir `https://portal.7estrivos.com.br`
2. DevTools → Network → tentar logar
3. Confirmar que as chamadas vão pra `api.7estrivos.com.br/auth/v1/token` (não mais pra `*.supabase.co`)
4. Se logar normal → pedir pra uma vendedora bloqueada testar

## Rollback

Se algo quebrar, reverter é trocar as 2 strings de volta. 30 segundos. Banco intacto.

