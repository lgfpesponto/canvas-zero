

## Diagnóstico (com prova no console da Fernanda)

O console da Fernanda mostra exatamente isto:

```
[Auth] login error: timeout
Failed to load resource: net::ERR_NAME_NOT_RESOLVED
        uxpcqqxlypshickabeyq...?ant_type=password
TypeError: Failed to fetch
    at Hpe ... signInWithPassword
```

Tradução técnica:
- `ERR_NAME_NOT_RESOLVED` = o **DNS do computador/rede da Fernanda não consegue resolver** `uxpcqqxlypshickabeyq.supabase.co`.
- `Failed to fetch` no `signInWithPassword` = a requisição **nunca chegou no Supabase**.
- Por isso o nosso `Promise.race` cai no `timeout` de 15s, e a tela mostra "Usuário ou senha incorretos".

Do nosso lado **não há mais o que consertar no fluxo de auth** — backend está saudável, a sessão dela renova quando consegue conectar (vimos nos logs de auth do Supabase). O problema agora é:

1. Conectividade dela com `*.supabase.co` (DNS, antivírus, firewall, provedor, extensão de navegador, DNS family-safe, OpenDNS, etc).
2. A nossa mensagem de erro está **mentindo** — diz "usuário/senha incorretos" quando na verdade é falha de rede. Isso confundiu todo mundo.

## Plano de correção

### 1. Corrigir mensagem de erro do login (parar de mentir)
Arquivo: `src/contexts/AuthContext.tsx` e `src/pages/LoginPage.tsx`

Hoje retornamos só `'ok' | 'error'`. Vou expandir para distinguir:
- `'ok'`
- `'invalid_credentials'` → "Usuário ou senha incorretos"
- `'network'` → "Sem conexão com o servidor. Verifique sua internet, antivírus ou DNS."
- `'timeout'` → "O servidor demorou demais para responder. Tente novamente."

Detecção:
- `Failed to fetch` / `TypeError` / `ERR_NAME_NOT_RESOLVED` → `network`
- string `'timeout'` → `timeout`
- demais erros do Supabase → `invalid_credentials`

Assim a Fernanda vai ver na hora "sem conexão" e saberemos que é problema da máquina/rede dela, não senha.

### 2. Adicionar botão "olho" para mostrar/ocultar senha
Arquivo: `src/pages/LoginPage.tsx`

Vou adicionar um ícone `Eye` / `EyeOff` (lucide-react) dentro do campo de senha, à direita, que alterna entre `type="password"` e `type="text"`. Padrão usado no resto do mercado.

Também vou aplicar o mesmo no campo de senha de:
- `src/pages/RegisterPage.tsx` (se existir o campo)
- `src/pages/RecoverPasswordPage.tsx` (se aplicável)

Mantendo o estilo atual do form (sem quebrar layout).

### 3. Mostrar diagnóstico de conectividade no erro de rede
Arquivo: `src/pages/LoginPage.tsx`

Quando o erro for `network`, além da mensagem, vou exibir um pequeno bloco com sugestões objetivas:
- Verificar conexão de internet
- Tentar em aba anônima
- Tentar em outra rede (4G do celular, por exemplo)
- Pedir para o TI liberar `*.supabase.co` no firewall/antivírus
- Trocar DNS para 1.1.1.1 ou 8.8.8.8

Isso resolve o suporte sem precisar abrir chamado.

## O que NÃO vou fazer
- Não vou mexer em `AuthContext` na parte de hidratação/race condition novamente — aquilo já foi corrigido na rodada anterior e **não é a causa atual**.
- Não vou alterar Edge Functions.
- Não vou criar migration.

## Resultado esperado
- Quando a Fernanda tentar logar de novo, se o DNS dela ainda estiver bloqueado, ela vai ver **"Sem conexão com o servidor"** em vez de "senha errada", com instruções claras.
- O campo de senha terá o ícone de olho para ela conferir o que digitou.
- Você (admin) vai conseguir diferenciar na hora: erro de credencial vs erro de rede do cliente.

## Arquivos que serão alterados
- `src/contexts/AuthContext.tsx` (tipo de retorno do `login` + classificação do erro)
- `src/pages/LoginPage.tsx` (mensagens específicas + botão olho + bloco de diagnóstico de rede)

