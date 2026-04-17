

## O que vou fazer (temporário, reversível)

### 1. Esconder a entrada da tela de verificação
- `src/App.tsx`: comentar a rota `/verificar` e o import do `VerifyCodePage`.
- Não apago o arquivo `src/pages/VerifyCodePage.tsx`, nem as edge functions `send-verification-code` / `verify-code`, nem a coluna `verificado` na tabela `profiles`. Tudo continua disponível para reativação futura.

### 2. Não mexer em nada do login do Supabase
- `signInWithPassword` continua igual.
- `AuthContext.login` já distingue `network` / `timeout` / `invalid_credentials` / `ok`.
- A `LoginPage` já mostra o bloco de "Diagnóstico de conexão" quando o erro é de rede.

### 3. Como reativar no futuro (1 linha de código)
- Descomentar o import e a rota `/verificar` em `src/App.tsx`. Pronto, volta tudo: a tela, o envio de código por email/SMS, o `verify-code`, e a coluna `verificado` continuam intactos no banco e nas edge functions.

## O que NÃO vou fazer agora
- Não vou apagar `VerifyCodePage.tsx`.
- Não vou apagar as edge functions de verificação.
- Não vou criar migration nem mexer na coluna `verificado`.
- Não vou mexer no Supabase client / URL.

## Aviso importante (responsabilidade)
A causa real do "não consigo entrar em várias máquinas" pelo print é **`DNS_PROBE_FINISHED_NXDOMAIN` em `uxpcqqxlypshickabeyq.supabase.co`** — bloqueio de DNS na rede dessas máquinas. Remover a tela de verificação **não vai resolver isso** porque o login nem chega a ser tentado. Seguindo seu pedido, faço a remoção temporária mesmo assim, mas o problema de conectividade vai continuar até atacar uma das duas frentes:

- TI das máquinas afetadas liberar `*.supabase.co` no firewall/DNS, ou
- Configurar Custom Domain do Supabase (plano Pro, ~25 USD/mês) para `api.7estrivos.com.br`.

## Arquivos alterados
- `src/App.tsx` (1 import + 1 rota comentados)

## Resultado esperado após implementar
- Tela de verificação some do app.
- Login continua funcionando exatamente como hoje (quem consegue conectar no Supabase entra; quem não consegue continua sem entrar).
- Reativação futura: descomentar 2 linhas em `App.tsx`.

