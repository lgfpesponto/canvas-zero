## Problema

O comprovante mostra **R$ 11.923,8** (onze mil novecentos e vinte e três reais e oitenta centavos, formato brasileiro), mas a IA extraiu **R$ 11,92**. O modelo interpretou o ponto como decimal e truncou o valor.

Isso acontece porque o prompt da edge function `extract-comprovante` pede o valor como "número com ponto decimal", mas não instrui explicitamente como converter a partir do formato brasileiro (`.` = milhar, `,` = decimal), então em valores com milhar o modelo confunde a separação.

## Correção

Ajustar `supabase/functions/extract-comprovante/index.ts`:

1. **Reforçar o prompt do sistema** deixando explícito o formato brasileiro:
   - "No Brasil o ponto (`.`) é separador de milhar e a vírgula (`,`) é separador decimal. Ex: `R$ 11.923,80` → `11923.80`; `R$ 1.234,56` → `1234.56`; `R$ 50,00` → `50.00`."
   - Instruir a copiar o valor exatamente como aparece no comprovante, sem arredondar nem truncar.
   - Reforçar que o `valor` retornado deve ser o valor total pago, idêntico ao exibido em destaque no comprovante.

2. **Validação de sanidade pós-extração** (defensiva): se o valor extraído for suspeito (ex.: possui centavos "quebrados" tipo `.8` isolado), logar aviso — mas não alterar o valor automaticamente, para não mascarar bugs.

3. **Sem mudanças no frontend** — o dialog `EnviarComprovanteDialog` continua permitindo o admin conferir/editar o valor antes de confirmar.

## Fora do escopo

- Reprocessar comprovantes já enviados: o comprovante do print continua com o valor errado no banco; o usuário pode reprovar/reenviar ou editar manualmente. Se quiser, posso ajustar o registro específico depois.
