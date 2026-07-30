## Problema

O comprovante do Mercado Pago exibe o valor como **R$ 339⁴** — os centavos vêm em *sobrescrito*, sem vírgula. A IA de extração leu os dígitos em sequência e gerou **3394** em vez de **339,40**.

Verifiquei o banco: não existe nenhum comprovante salvo com valor 3394 (o único registro correspondente, da Larissa em 24/07, está correto com R$ 339,40). Ou seja, o erro está acontecendo apenas na tela de extração/pré-preenchimento, antes de salvar — a correção necessária é na extração, não em dados já gravados.

## O que vou fazer

**Edge function `extract-comprovante`** — reforçar as regras de leitura de valor no prompt:

- Explicar o padrão Mercado Pago / Nubank / PicPay em que os centavos aparecem em fonte menor/sobrescrita logo após os reais, sem vírgula:
  - `R$ 339⁴` → 339.40 (um dígito sobrescrito = dezena de centavos)
  - `R$ 339⁴⁰` → 339.40
  - `R$ 1.250⁰⁰` → 1250.00
- Regra explícita: quando houver 1 ou 2 dígitos visualmente separados/menores no fim do valor, eles são **centavos**, nunca parte do valor inteiro.
- Manter as regras já existentes de ponto = milhar e vírgula = decimal.
- Reforçar a validação cruzada: se o comprovante tiver o valor escrito por extenso ou repetido em outro ponto do documento, usar essa ocorrência para confirmar.

**Validação de segurança na resposta da função** (defensivo, sem depender só da IA):
- Se a IA retornar um número inteiro sem centavos e o texto do documento sugerir formato sobrescrito, manter o valor como veio (não inventar), mas registrar log para auditoria.

O campo de valor já é editável manualmente no diálogo de envio, então qualquer caso extremo continua corrigível pelo usuário antes de salvar.

## Detalhes técnicos

Arquivo alterado: `supabase/functions/extract-comprovante/index.ts` (apenas o `systemPrompt` e logs). Sem migração de banco e sem alteração de front-end.
