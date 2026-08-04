# Corrigir leitura de valor em comprovantes PDF

## Problema confirmado

O PDF enviado contém, no texto, `Valor  R$ 1517,20`. A IA retornou `517,20` — perdeu o primeiro dígito. Ou seja, o erro está na conversão feita pelo modelo, não no arquivo.

Hoje a função `extract-comprovante` pede à IA um campo `valor` já convertido em número, sem nenhuma checagem do que estava escrito no comprovante.

## Solução

Parar de confiar no número convertido pela IA e converter o valor no servidor, a partir do texto literal impresso no comprovante.

1. A IA passa a devolver dois campos:
   - `valor_texto`: o valor exatamente como aparece no documento (ex.: `R$ 1517,20`, `R$ 339⁴⁰`, `R$ 11.923,80`), copiado caractere a caractere, sem interpretar.
   - `valor`: a conversão numérica (mantida como reserva).
2. A função converte `valor_texto` com um parser brasileiro determinístico:
   - remove `R$` e espaços;
   - vírgula = decimal, ponto seguido de 3 dígitos = milhar;
   - dígitos sobrescritos (⁰¹²³⁴⁵⁶⁷⁸⁹) no fim viram centavos;
   - 1 dígito decimal vira dezena de centavos (`,8` → `,80`).
3. Se a conversão do texto e o número da IA divergirem, vale o texto e a divergência fica registrada no log para auditoria.
4. Reforçar o prompt: nunca omitir dígitos, copiar todos os dígitos antes da vírgula.

Nenhuma mudança em telas: a correção manual do valor na tela de comprovantes continua disponível como último recurso.

## Detalhes técnicos

- Arquivo: `supabase/functions/extract-comprovante/index.ts`
- Adicionar `valor_texto` (string, obrigatório) ao schema da tool `registrar_comprovante`.
- Nova função `parseValorBR(texto: string): number` no mesmo arquivo, usada como fonte primária do campo `valor` na resposta.
- `console.warn` quando `|parseValorBR(valor_texto) - valor_ia| > 0.01`.
- Redeploy da função após a alteração.
