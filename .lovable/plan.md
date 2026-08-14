# Corrigir tamanhos da Bota Montaria (40)

## Problema
Hoje a Bota Montaria (40) aparece em qualquer tamanho de 24 a 45, inclusive nos tamanhos infantis (24–33), como no print onde ela surge junto com Bota Infantil, Botina Infantil e Cano Médio Infantil no tamanho 24.

## Correção
A Bota Montaria (40) passa a seguir a mesma faixa de tamanhos da Bota Tradicional: **34 a 45**. Nos tamanhos 24–33 só continuam aparecendo os modelos infantis.

## Detalhes técnicos
- `src/lib/orderFieldsConfig.ts`, função `getModelosForTamanho`: remover o bloco que libera `Bota Montaria (40)` de 24 a 45 e incluir o modelo na lista da faixa 34–45 (junto com Bota Tradicional, Feminino, Peão etc.).
- `docs/BUSINESS_RULES.md`, seção B: atualizar a linha da Bota Montaria (40) para faixa 34–45.
- Pedidos já criados não são alterados.
