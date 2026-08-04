# Corrigir erro ao importar comprovantes

## O que está acontecendo

Ao enviar um comprovante aparece "Failed to send a request to the Edge Function". A causa não é o código: uma chamada direta à função de extração (`extract-comprovante`) responde `NOT_FOUND_FUNCTION_BLOB` ("Requested function was not found") e não existe nenhum log dela — ou seja, a função deixou de estar publicada no servidor. Isso bate com o relato de que funcionava antes das últimas mudanças (valor correto e bloqueio de duplicados): o último deploy dessa função não foi concluído, e desde então nenhuma requisição chega a executar. Por isso falha para todos os vendedores igualmente.

O arquivo `supabase/functions/extract-comprovante/index.ts` está íntegro no projeto (9 KB, sem dependências externas), então basta republicar.

## O que será feito

1. Republicar a função `extract-comprovante`.
2. Testar o endpoint já publicado com uma chamada real e confirmar que ele responde (esperado: erro de validação "fileBase64 obrigatório" quando enviado sem arquivo — prova de que a função está no ar).
3. Fazer um teste com um comprovante de exemplo para confirmar que a extração de valor e a detecção de duplicidade continuam funcionando como combinado.
4. Verificar as demais funções em uso (Bagy, fichas, storage) para garantir que nenhuma outra ficou sem deploy no mesmo episódio.

## Detalhes técnicos

- Sem alteração de código: o problema é ausência do bundle publicado, não erro de execução.
- `supabase/config.toml` já define `verify_jwt = false` para essa função — sem mudança.
- Validação via chamada HTTP direta ao endpoint e leitura dos logs da função após o redeploy.
