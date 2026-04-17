

O usuário pediu pra eu testar o login do site, igual fiz de manhã. Vou rodar os mesmos testes de conectividade pra confirmar se o Supabase continua respondendo normalmente.

## Teste a executar (quando aprovar)

Os mesmos 3 testes de conectividade de manhã:

1. **DNS lookup** do `uxpcqqxlypshickabeyq.supabase.co` — confirma se o domínio resolve
2. **Health check** no GoTrue (`/auth/v1/health`) — confirma se o serviço de auth está no ar
3. **Tentativa de login real** com credencial inválida — confirma se o endpoint `/auth/v1/token` está respondendo `invalid_credentials` corretamente (prova ponta a ponta que dá pra logar)

## O que vou reportar

Tabela com:
- Status de cada teste (✅/❌)
- Tempo de resposta
- IP do servidor
- Comparação com o teste de manhã (mudou alguma coisa?)

## Por que precisa aprovar

Estou em modo plan (read-only). Pra rodar `curl` e `nslookup` preciso passar pro modo default. Aprova que eu rodo os 3 testes em paralelo e te trago o resultado em ~10 segundos.

## O que NÃO vou mexer

Zero código. Só teste de conectividade pra te dar diagnóstico atual do Supabase.

