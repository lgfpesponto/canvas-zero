# Bloquear comprovante duplicado no envio do vendedor

## Problema

A checagem de duplicidade existe hoje apenas no navegador, dentro do envio de comprovantes do vendedor, e ela escapa em três situações:

- O arquivo é uma foto/print novo do mesmo comprovante, então o hash muda.
- A leitura automática grava o nome do pagador com pequena variação (acentos, "LTDA", maiúsculas com espaço extra), e a comparação por nome não casa.
- Nada impede o registro no banco: se a checagem no navegador falhar por qualquer motivo (erro de rede, corrida entre dois envios ao mesmo tempo), o comprovante entra.

## O que muda

1. **Bloqueio definitivo no banco**: passa a existir uma regra no próprio banco que recusa o cadastro de um comprovante repetido do mesmo vendedor. Vale para todos, inclusive admin master — não há opção de "salvar mesmo assim".
2. **Critério de duplicidade** (mantido como hoje, porém mais tolerante a variações de leitura):
   - mesmo arquivo (hash idêntico), **ou**
   - mesmo valor + mesma data de pagamento + mesmo pagador.
   - O pagador passa a ser comparado de forma normalizada: primeiro pelo documento (CPF/CNPJ) quando existir; se não existir, pelo nome sem acentos, sem pontuação e sem diferenciar maiúsculas/minúsculas.
3. **Mensagem clara**: ao tentar enviar, o comprovante fica marcado como erro com o texto explicando qual comprovante já existente é igual (valor, data e pagador), sem interromper os demais arquivos do lote.
4. A checagem no navegador continua existindo (feedback imediato), mas agora usa o mesmo critério normalizado, então os dois níveis concordam.

## Detalhes técnicos

- Migração: função de normalização `imutável` (unaccent/upper/limpeza) + índice único parcial em `revendedor_comprovantes` sobre `(vendedor, comprovante_hash)` e sobre `(vendedor, valor, data_pagamento, chave_pagador_normalizada)`, onde `chave_pagador_normalizada` é uma coluna gerada a partir de `pagador_documento` (só dígitos) com fallback para `pagador_nome` normalizado.
- Antes de criar os índices, verificar/limpar duplicatas já existentes (hoje há 1 par: Rafael Silva, R$ 10.000, 01/06/2026) — o par antigo será mantido e o índice criado sem quebrar, tratando esse caso explicitamente na migração.
- `src/components/financeiro/saldo/EnviarComprovanteDialog.tsx`: substituir o `ilike('pagador_nome', ...)` pela comparação normalizada (documento primeiro) e tratar o erro de violação de índice único do insert (código `23505`) exibindo a mensagem de duplicidade em vez de erro genérico.
- Nenhuma mudança no financeiro admin (`FinanceiroAReceber` / `FinanceiroAPagar`) nesta rodada.
