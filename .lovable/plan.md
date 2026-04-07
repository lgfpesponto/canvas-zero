

## Filtro de progresso no relatório de Extras/Cintos + Verificar Bainha de Cartão

### Problema 1: Sem filtro de progresso de produção

O relatório de Extras/Cintos não possui filtro de "Progresso de Produção". A variável `needsProgressFilter` (linha 1376) não inclui `extras_cintos`, e a função `generateExtrasCintosPDF` (linha 1279) não filtra por `filterProgresso`.

### Problema 2: Bainha de Cartão sem gerar PDF

A entrada `bainha_cartao` no `PRODUCT_GROUPABLE_FIELDS` já foi adicionada (linhas 97-100), mas a função `generateExtrasCintosPDF` pode não estar gerando o PDF caso não haja pedidos com `tipoExtra === 'bainha_cartao'` e `extraDetalhes` preenchido. Vou adicionar um toast de aviso quando não houver pedidos encontrados, para que o usuário saiba o motivo.

### Alterações em `src/components/SpecializedReports.tsx`

#### 1. Adicionar `extras_cintos` ao filtro de progresso
Linha 1376: incluir `extras_cintos` na condição `needsProgressFilter`.

#### 2. Filtrar por progresso no `generateExtrasCintosPDF`
Linha 1279: adicionar filtro `(filterProgresso === 'todos' || o.status === filterProgresso)`.

#### 3. Aviso quando não há pedidos
Após a filtragem (linha 1279), se `filtered.length === 0`, exibir um `toast.error('Nenhum pedido encontrado')` e retornar sem gerar o PDF. Isso resolve o caso da Bainha de Cartão (e qualquer outro produto) quando não há dados.

#### 4. Incluir progresso no título do PDF
Adicionar o label do progresso no título/subtítulo do PDF gerado, igual aos outros relatórios.

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/components/SpecializedReports.tsx` | Filtro de progresso no extras/cintos, aviso de "sem pedidos", label no PDF |

