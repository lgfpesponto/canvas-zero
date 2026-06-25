## Ajustes no PDF `generateBaixaMontagemPDF` (src/lib/pdfGenerators.ts)

Pequenos ajustes de layout no relatório de Baixa Montagem — sem mexer em portal, hooks ou cálculos.

### 1. Remover coluna QTD
- Remover header "Qtd" e a célula da quantidade em cada linha de pedido.
- Quando `quantidade > 1`, mostrar a multiplicação dentro da coluna **Valor** no formato `2 × R$ 21,00 = R$ 42,00` (mantém a informação sem precisar da coluna dedicada).
- Para `ERRO MONTAGEM`, segue só `ERRO` (vermelho, bold) na coluna Valor.

### 2. Aumentar espaço entre "Nº pedido" e "Data baixa"
- Redistribuir as colunas dando mais respiro entre Nº pedido e Data, e mais largura ainda para Modelo (já que Qtd saiu):
  ```
  #   Nº pedido        Data baixa       Modelo .................................  Valor
  15  25               55               90 → ~165 (≈75mm)                          180 (right)
  ```
- Header da tabela e linhas dos pedidos seguem o mesmo grid.

### 3. Total geral de pares
- No bloco de totais, manter as linhas por valor (`N × R$ 19,00 = R$ XX,XX`, etc.) e a linha `TOTAL GERAL  R$ YYY,YY`.
- Adicionar **logo abaixo do TOTAL GERAL** uma linha:
  - `TOTAL DE PARES: N` (bold, alinhada à direita junto com os outros totais).
  - `N` = soma de `quantidade` de **todos** os itens da lista, incluindo `ERRO MONTAGEM` (são pares montados, mesmo que não cobrados).

### Nada mais muda
- Margens, multi-página, linhas finas entre pedidos, assinatura, numeração de página, separação em vias — tudo permanece como está hoje.
