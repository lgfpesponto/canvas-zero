## Objetivo
Fazer o PDF de Cobrança espelhar **exatamente** a tela de detalhe do pedido — tanto a composição (linhas individuais com seus preços) quanto o Total final (depois de subtotal ± desconto/acréscimo). Isso deve valer para todos os pedidos, inclusive os antigos.

## Por que ainda diverge hoje
A tela de detalhe (`OrderDetailPage`) e o PDF (`generateCobrancaPDF` em `SpecializedReports.tsx`) montam a composição com lógicas **paralelas**, e em alguns pontos elas não batem:

1. **Bordados cadastrados em "bordados-visual"** (com campo `bordado_cano` / `bordado_gaspea` / `bordado_taloneira`):
   - Detalhe usa `findFichaPrice` por **campo** (`bordado_cano`) → encontra.
   - PDF usa `priceWithFallback` por **categoria** (`bordados-cano`) → não encontra e cai no fallback hardcoded.
   - Pedido 23429 tem `Ramos jessica` cadastrado em `bordados-visual / campo bordado_cano` por R$ 35. No portal aparece a linha de R$ 35; no PDF some.

2. **Couros com preço diferente por região** (ex.: `Vaca Holandesa` = R$ 15 em cano/gáspea, mas **R$ 0** na taloneira):
   - Detalhe consulta o banco por região e respeita o R$ 0 da taloneira.
   - PDF usa `COURO_PRECOS[t]` (mapa hardcoded por nome do couro, sem região) e cobra R$ 15 nos três.
   - Pedidos 23375/23377/23384 mostram exatamente esse padrão (3 linhas de couro idênticas R$ 15 no PDF, contra 2× R$ 15 + 1× R$ 0 no portal).

3. **Total final**: já está sendo calculado a partir do subtotal local na correção anterior, mas como a composição local diverge da do detalhe (itens 1 e 2), o Total acaba diferente mesmo assim.

4. **Pedidos antigos**: o `RecalcPrecosRunner` ignora `Cobrado` e `Pago`, então pedidos históricos podem continuar com `preco` antigo no banco (não afeta mais o PDF depois da correção, mas afeta outras telas que ainda leem `order.preco`).

## O que será feito

### 1) Alinhar a montagem da composição do PDF com a do detalhe
Em `generateCobrancaPDF`, no bloco de bota normal:

- **Bordados**: ampliar a busca para incluir também a categoria `bordados-visual` (onde os bordados visuais ficam cadastrados), além de `bordados-cano` / `bordado_cano`. Mesma coisa para gáspea e taloneira. Assim "Ramos jessica" e similares aparecem com o preço correto do banco.
- **Couros**: trocar o `COURO_PRECOS[t]` (mapa global por nome) por uma busca por **região** (cano / gáspea / taloneira), igual o detalhe faz. Quando a ficha tiver R$ 0 para aquela região, o PDF respeita R$ 0.
- **Cor da Vira**: a tela de detalhe lista qualquer cor com preço > 0; o PDF hoje filtra Bege/Neutra antes mesmo de checar o preço. Vou alinhar com a regra do detalhe (mostrar quando houver preço > 0).

### 2) Total do PDF = Total do detalhe (subtotal recalculado ± ajuste)
A linha de Total já passa a sair de `subtotal local + ajuste`. Após o item 1, o subtotal local **vai bater** com o subtotal do portal, e portanto o Total também.

Confirmação esperada para os pedidos citados:
- 23429 → R$ 300,00 (260 + 35 + 5)
- 23375 → R$ 370,00 (260 + 15 + 15 + 0 + 60 + 20 acréscimo)
- 23377 → R$ 370,00 (mesma composição, acréscimo 20)
- 23384 → R$ 335,00 (260 + 15 + 15 + 0 + 60 − 15 desconto)
- 23468 → mesmo total exibido no portal

### 3) Espelhar nos itens individuais (não só na soma)
As mudanças do item 1 são feitas no array `priceItems`, que é o que vira a coluna "PREÇO" linha-a-linha do PDF. Ou seja, **cada linha individual** do pedido também passa a ter o valor certo, não só o total final.

### 4) Reaplicar a varredura retroativa em pedidos cobrados/pagos (opcional mas recomendado)
Atualizar `RecalcPrecosRunner` para incluir também `Entregue`, `Cobrado` e `Pago` na varredura, e subir a versão da chave (`recalc_precos_v2_done`) para forçar uma nova rodada após o deploy. Isso normaliza o `order.preco` no banco para qualquer outra tela/relatório que ainda dependa dele.

## Arquivos afetados
- `src/components/SpecializedReports.tsx` (bloco da composição em `generateCobrancaPDF` e helper `buildCompositionItems`)
- `src/components/gestao/RecalcPrecosRunner.tsx` (escopo da varredura + nova chave)

## Validação manual após implementar
Gerar novamente o PDF de Cobrança do Rafael e conferir:
- composição linha-a-linha igual à tela de cada pedido
- coluna PREÇO de cada linha = Total do detalhe
- soma final do PDF = soma das linhas

Se aprovar, eu aplico.