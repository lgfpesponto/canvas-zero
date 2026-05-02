Objetivo: corrigir o PDF de cobrança para remover o problema visual da coloração, trocar isso por um marcador discreto de status e acertar a composição/preço exibido em pedidos de cinto.

O que vou alterar

1. Remover totalmente a coloração de texto no PDF de cobrança
- Tirar o bloco que redesenha a palavra “Acréscimo” ou “Desconto” por cima do texto preto.
- Deixar toda a composição sempre em preto, inclusive justificativa.
- Isso elimina de vez o efeito de palavra duplicada/deslocada visto no PDF.

2. Adicionar um indicador visual com bolinha no quadro da composição
- Quando o pedido tiver acréscimo ativo (`o.desconto < 0`), desenhar uma bolinha pequena verde no canto inferior direito da célula de composição.
- Quando o pedido tiver desconto ativo (`o.desconto > 0`), desenhar a mesma bolinha em vermelho na mesma posição.
- Quando não houver ajuste ativo (`o.desconto === 0` ou vazio), não desenhar bolinha.
- A bolinha ficará dentro do quadro da composição, sem interferir no texto.

3. Corrigir a composição dos pedidos de cinto no PDF de cobrança
- Hoje o PDF monta cinto com `['Cinto', 0]`, por isso aparece “Cinto R$ 0,00”.
- Vou alinhar essa montagem com a lógica já usada no restante do sistema, onde o valor-base do cinto vem do tamanho selecionado (`BELT_SIZES`).
- Em vez de mostrar “Cinto R$ 0,00”, a composição passará a exibir apenas os itens reais de preço do cinto, por exemplo:
  - `Tamanho: 1,10 cm R$ 100,00`
  - `Bordado P R$ 10,00` quando existir
  - `Nome Bordado R$ 40,00` quando existir
  - `1 a 3 carimbos R$ 20,00` / `4 a 6 carimbos R$ 40,00` quando existir
- Assim o valor-base deixa de aparecer zerado e passa a refletir o mesmo cálculo já usado em detalhe/edição.

4. Preservar a ordem que já ficou correta
- Manter a sequência da composição como está funcionando agora:
  - itens da composição
  - `Acréscimo` ou `Desconto` com valor
  - `Justificativa (...)` com o texto limpo, sem repetir o valor
- Não vou mexer na ordem, apenas no visual e na origem do preço do cinto.

Arquivos envolvidos
- `src/components/SpecializedReports.tsx`

Detalhes técnicos
- O bloco específico de `generateCobrancaPDF()` para cinto será ajustado para usar a mesma regra de belt já presente em outras telas: buscar o preço pelo `det.tamanhoCinto`, em vez de inserir `Cinto = 0`.
- Também vou aceitar o padrão salvo do cinto que já existe no projeto (`Tem`), para não depender de `Sim` e evitar inconsistência entre criação/edição e PDF.
- A bolinha será desenhada com `doc.setFillColor(...)` + `doc.circle(...)` posicionada pela largura/altura da coluna de composição.
- O texto da composição continuará sendo renderizado uma única vez via `doc.text(...)`, sem overlay posterior.

Resultado esperado
- Nada mais colorido dentro do texto.
- Acréscimo/desconto indicado só por uma bolinha discreta.
- Cintos sem “R$ 0,00” no item base.
- Ordem atual de ajuste + justificativa preservada.

Se você aprovar, eu aplico exatamente essas mudanças no gerador do PDF de cobrança.