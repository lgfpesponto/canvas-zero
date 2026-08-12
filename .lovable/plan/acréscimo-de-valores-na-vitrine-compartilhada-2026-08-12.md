# Acréscimo de valores na vitrine compartilhada

Permitir que o admin master aplique um acréscimo apenas na exibição de preços da vitrine pública. O acréscimo não altera nada no estoque nem no valor real dos produtos — é só visual, carregado dentro do próprio link.

## Como funciona

No diálogo "Compartilhar vitrine" (página Estoque):

1. Ao ligar "Mostrar preços", aparece um novo bloco "Acréscimo".
2. O admin escolhe o tipo: **R$ (valor fixo)** ou **% (percentual)**.
3. Digita o valor (ex.: 50 ou 10%). Zero/vazio = sem acréscimo.
4. Uma prévia mostra um exemplo: "R$ 500,00 → R$ 550,00".
5. O link gerado já embute essa configuração.

Na vitrine pública:
- Todo preço exibido sai com o acréscimo aplicado.
- Quando "Mostrar descontos" está ligado, o preço riscado e o preço final recebem o mesmo acréscimo, mantendo o rótulo do desconto coerente (o percentual de desconto continua o mesmo).
- Nada é exibido ao visitante sobre o acréscimo — ele só vê o preço final.

Visível somente para admin master, junto com os toggles de preço já existentes (vendedores continuam sem preços).

## Detalhes técnicos

- `src/lib/vitrineToken.ts`: adicionar ao `VitrinePayload` os campos `acrescimoTipo` ('real' | 'percent') e `acrescimoValor` (number), com decodificação tolerante (default 0 / 'percent').
- `src/components/estoque/CompartilharVitrineDialog.tsx`: estado local para tipo e valor; bloco renderizado apenas quando `canTogglePrecos && mostrarPreco`; incluir os campos no payload apenas quando `mostrarPreco` for verdadeiro; prévia com base em R$ 500.
- `src/pages/VitrinePublicaPage.tsx`: função `aplicarAcrescimo(v)` derivada do payload; aplicar em `g.preco` e em `desc.precoFinal` antes de formatar em BRL. Nenhuma alteração de dados ou consulta.
