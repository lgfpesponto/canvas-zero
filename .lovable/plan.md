## Ajuste nos relatórios de Corte e Bordado

Hoje as duas tabelas usam o mesmo layout de 4 colunas:

`[Nº PEDIDO + barcode embaixo]  |  DESCRIÇÃO  |  QR CODE  |  RECEITA / CHECK (vazio)`

Você quer:
1. A coluna larga de "Receita" (Bordado) e "Check" (Corte) virar **um quadradinho de check pequeno** — não uma coluna larga vazia.
2. O **código de barras sair de baixo do número do pedido** e virar **coluna própria**.
3. A ordem das colunas passar a ser: **Nº PEDIDO → DESCRIÇÃO → CÓDIGO DE BARRAS → QR CODE → CHECK**.

---

### Mudanças (somente `src/components/SpecializedReports.tsx`)

Aplicar nas duas funções, com layout idêntico:
- `generateBordadosPDF` (~linhas 773–921)
- `generateCortePDF` (~linhas 924–1029)

#### 1. Nova grade de colunas (largura útil = 182mm)

```
cols = [22, 95, 38, 18, 9]   // total = 182
       Nº    Descrição  Bcode  QR   Check
```

- **Nº PEDIDO**: 22mm (só texto, sem mais barcode embaixo).
- **DESCRIÇÃO**: 95mm (continua o `splitTextToSize` existente — só ajustar `cols[1]-4`).
- **CÓDIGO DE BARRAS**: 38mm — desenhar `barcodeImg` centralizado (`addImage` em `cx[2]+1, y+(rowH-10)/2, 36, 10`).
- **QR CODE**: 18mm — QR de 14mm centralizado verticalmente na linha (`cx[3]+2, y+(rowH-14)/2`).
- **CHECK**: 9mm — desenhar um quadradinho 5×5mm centralizado (`doc.rect(cx[4]+2, y+(rowH-5)/2, 5, 5)`), sem texto.

#### 2. Cabeçalho da tabela

Ambos passam a usar:
```
Nº PEDIDO | DESCRIÇÃO DO BORDADO/CORTE | CÓDIGO DE BARRAS | QR CODE | CHECK
```

#### 3. Remoção do barcode embaixo do número

Apagar o bloco que hoje desenha o barcode dentro da coluna `Nº PEDIDO` (linhas 900–905 em Bordados e 1008–1013 em Corte). O barcode passa a ser desenhado só na nova coluna dedicada.

#### 4. Altura mínima da linha

`rowH = Math.max(18, lines.length * 3 + 6)` — sobe um pouquinho o mínimo de 14→18mm pra dar respiro pro barcode (10mm) e pro QR (14mm) ficarem confortáveis na linha. Linhas com descrição grande continuam crescendo dinamicamente como hoje.

#### 5. Sem mudanças em

- Pesponto (continua com barcode em coluna própria, já é o padrão).
- Filtros, ordenação, exportação, histórico de impressão.
- Banco / hook / outros relatórios.

---

### Resultado visual

Antes (Bordado):
```
| 7E-AB0001        | Cano: ... Cor: ... | [QR] | [coluna grande vazia    ] |
| [||||||||||||||] | Gáspea: ...        |      |                            |
```

Depois (Bordado e Corte iguais):
```
| 7E-AB0001 | Cano: ... Cor: ...  | [||||||||||||||] | [QR] | [☐] |
|           | Gáspea: ...          |                  |      |     |
```

---

### Arquivos editados

- `src/components/SpecializedReports.tsx` — só as duas funções `generateBordadosPDF` e `generateCortePDF`.

### Banco / memória

- Sem migração.
- Sem nova memória — é refinamento visual de relatório já documentado em `mem://features/reports/bordados-report-standards` e `mem://features/reports/corte-report-standards`. Caso aprove, posso atualizar essas duas notas pra refletir o novo layout (5 colunas com barcode dedicado e check minúsculo).