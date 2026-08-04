# Corrigir erro ao importar comprovantes

## O que está acontecendo

Ao enviar um comprovante, o portal mostra "Failed to send a request to the Edge Function". A causa é que a função de extração de comprovantes (`extract-comprovante`) não está mais publicada no servidor: uma chamada direta a ela retorna `NOT_FOUND_FUNCTION_BLOB` ("Requested function was not found"), e não há nenhum registro de log dela — ou seja, nenhuma requisição chega a ser executada. Isso afeta todos os vendedores igualmente, porque nenhum consegue passar da etapa de leitura do arquivo.

## O que será feito

1. Republicar a função `extract-comprovante` (o código no projeto está íntegro; só falta o deploy ativo).
2. Testar a função já publicada com uma requisição real e confirmar que ela responde (validação de campos e extração), em vez de erro de rede.
3. Verificar rapidamente as demais funções usadas no dia a dia (Bagy, fichas, storage) para garantir que nenhuma outra ficou sem deploy.
4. Se a função voltar mas houver erro de créditos/limite da IA, reportar isso claramente em vez de deixar a mensagem genérica de rede.

## Detalhes técnicos

- `supabase/functions/extract-comprovante/index.ts` permanece como está; o deploy é acionado por um redeploy da função.
- Validação pós-deploy via chamada HTTP direta ao endpoint (esperado: 400 "fileBase64 obrigatório" quando enviado sem arquivo, provando que a função está viva).
- `supabase/config.toml` já tem `verify_jwt = false` para esta função — sem mudança necessária.
