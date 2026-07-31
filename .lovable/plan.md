# Corrigir preço do produto de estoque (caso Pipoco Preta)

## O que está acontecendo

O pedido de origem da Pipoco Preta 34 (`cxcx3401`) tem na ficha **Laser da Taloneira = Pipoco**, além de cano e gáspea.

- O formulário "Faça seu pedido" cobra R$50 por Laser da Taloneira, então o pedido foi salvo em **R$470** e o produto de estoque nasceu com esse mesmo valor.
- O reconciliador de preços (que roda depois) **não** cobra Laser da Taloneira, então recalculou o pedido para **R$420** — mas o produto de estoque não é recalculado e ficou preso em R$470.
- A composição dos pedidos de estoque também cobra Laser da Taloneira, ou seja, hoje três lugares divergem entre si.

## Decisões aplicadas

1. Laser da Taloneira passa a **não ter valor (R$0)** em todo o sistema.
2. O preço do produto de estoque passa a **acompanhar a ficha**, mas apenas para produtos criados de agora em diante — produtos de estoque já criados não são recalculados automaticamente.
3. Correção pontual dos produtos já cadastrados que estão com o valor inflado pelo Laser da Taloneira (Pipoco Preta 34: 470 → 420; conferir também "Anjo Bico Fino Horse Nescau Detalhes Verde", que tem o mesmo caso).

## O que será feito

### Laser da Taloneira sem valor
- `src/lib/orderFieldsConfig.ts`: `LASER_TALONEIRA_PRECO` passa de 50 para 0.
- `src/pages/OrderPage.tsx` e `src/pages/EditOrderPage.tsx`: a linha "Laser Taloneira" continua aparecendo na composição, mas com R$0 (sem fallback de 50 e sem preço de ficha).
- `src/lib/estoqueOrderComposition.ts`: a linha de Laser Taloneira deixa de somar R$50 (hoje usa `LASER_CANO_PRECO`); Glitter Taloneira também passa a R$0, alinhado com o formulário.
- Resultado: formulário, reconciliador e composição de estoque passam a dar o mesmo total.

### Preço do estoque acompanha a ficha (novos)
- Ao criar produto de estoque a partir de um pedido, o preço gravado passa a ser o total recalculado da ficha (mesma regra do reconciliador), em vez de copiar cegamente `orders.preco`.
- Produtos já existentes ficam como estão (não há recálculo em massa).

### Correção pontual dos produtos afetados
- Migração ajustando o preço dos produtos de estoque cujo valor embute o Laser da Taloneira, com registro no log de ajustes para rastreabilidade.
- Depois da correção, os produtos corrigidos entram na fila de sincronização de preço com a Bagy, para o valor bater nos dois lados.

## Verificação
- Conferir na página Estoque que "Pipoco Preta 34" mostra R$440/R$420 conforme a composição (260 + 50 + 50 + 30 + 30 = 420).
- Abrir um pedido de estoque e conferir que a composição soma o mesmo valor do preço do pedido.
- Criar um pedido de bota com Laser da Taloneira e confirmar que o total não muda.
