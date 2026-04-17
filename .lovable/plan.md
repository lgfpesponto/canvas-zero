

## O que vou fazer

Rodar 3 testes agora, do lado do servidor, pra **provar** que o Supabase está acessível normalmente:

1. **DNS**: `dig uxpcqqxlypshickabeyq.supabase.co` — confirma que o domínio resolve pra um IP válido
2. **Conectividade HTTPS**: `curl -I https://uxpcqqxlypshickabeyq.supabase.co/auth/v1/health` — confirma que o servidor responde
3. **Endpoint de auth**: `curl https://uxpcqqxlypshickabeyq.supabase.co/auth/v1/health` — confirma que o serviço GoTrue (login) está vivo

## Resultado esperado

- **Tudo OK aqui** → o Supabase está 100% saudável. O problema é exclusivamente na rede/máquina da Fernanda.
- **Algum erro aqui** → aí sim é problema do Supabase ou do projeto, e a gente investiga outro caminho.

Em ambos os casos, em 30 segundos a gente sai da dúvida.

## Próximo passo dependendo do resultado

- Se Supabase OK → te entrego um print/relatório curto que você pode mandar pra Fernanda mostrando "o servidor está no ar, o problema é aí na sua rede".
- Se Supabase com problema → mudo o foco da investigação pra lá.

## Arquivos alterados
Nenhum. É só diagnóstico via terminal, não mexe em código.

