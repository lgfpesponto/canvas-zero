

## Diagnóstico: Informações faltando nas fichas impressas (PDF)

### Problemas encontrados

#### 1. Campo "Desenvolvimento" nunca é impresso (BOTA)
O campo `desenvolvimento` é coletado no formulário de pedido (`OrderPage.tsx` linha 166), salvo no banco de dados, mas **nunca é adicionado ao PDF** em `pdfGenerators.ts`. Ele simplesmente não existe na construção das categorias do PDF (linhas 296-368).

#### 2. Campo "Fivela" nunca é impresso (CINTO)
O campo `fivela` é obrigatório no formulário de cinto (`BeltOrderPage.tsx` linha 140), salvo no `extraDetalhes`, mas o PDF de cinto (linhas 129-239) **não renderiza a fivela**. Só mostra COURO, BORDADOS, CARIMBO e OBS.

#### 3. Truncamento silencioso de conteúdo
Nas linhas 400 e 408, o código faz `if (cy > descBottom) return;` — se uma coluna ultrapassar o limite de espaço (~62.5mm por coluna), os campos restantes são **silenciosamente descartados** sem nenhum aviso ou continuação em outra página.

### Correções propostas

**Arquivo: `src/lib/pdfGenerators.ts`**

1. **Adicionar "Desenvolvimento"** na seção de categorias do boot layout — como uma nova categoria entre EXTRAS ou em posição própria, exibindo o valor quando preenchido

2. **Adicionar "Fivela"** no layout de cinto — como uma nova categoria após COURO, exibindo o tipo e descrição personalizada quando "Outro"

3. **Melhorar tratamento de overflow** — em vez de silenciosamente ignorar campos que ultrapassam `descBottom`, redistribuir melhor as categorias ou adicionar indicação visual quando conteúdo é cortado

### O que NÃO muda
- Estrutura geral do PDF (A5 landscape, 3 colunas, stubs com barcode)
- Ordenação por tipo de couro
- Lógica de QR code e barcode
- Demais campos já renderizados corretamente

