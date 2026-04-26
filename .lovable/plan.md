## Reordenação das colunas — Relatórios de Corte e Bordado

Ajuste só visual em `src/components/SpecializedReports.tsx`, nas funções `generateBordadosPDF` (~linhas 773–934) e `generateCortePDF` (~linhas 937–1050).

### Nova ordem das colunas

```
| Nº PEDIDO            | DESCRIÇÃO       | QR CODE | CHECK |
| [|||||||||||||||||]  |  Cano: ...      |  [QR]   |  [☐]  |
|     7E-AB0001        |  Gáspea: ...    |         |       |
```

A 1ª coluna vira **uma coluna composta**: código de barras em cima e o número do pedido escrito embaixo. O cabeçalho dela continua "Nº PEDIDO".

### Novas larguras (total continua 182mm)

```ts
// antes: const cols = [22, 95, 38, 18, 9];   // Nº | Desc | Barcode | QR | Check
// depois:
const cols = [42, 110, 18, 12];               // Nº+Barcode | Desc | QR | Check
```

- **Coluna 1 (42mm)**: barcode (~38mm de largura, 10mm de altura) centralizado em cima + nº do pedido em texto centralizado embaixo.
- **Coluna 2 (110mm)**: descrição — fica mais enxuta que antes (era 95, agora 110 — na verdade ganha espaço porque sumiu a coluna dedicada do barcode). Se preferir descrição menor ainda, posso usar 100mm e sobrar 10mm para folga; me avise.
- **Coluna 3 (18mm)**: QR code 14×14mm centralizado.
- **Coluna 4 (12mm)**: quadradinho de check 5×5mm centralizado.

### Mudanças no desenho da linha

Em ambas as funções:

1. **Cabeçalho** passa a ter 4 colunas:
   ```
   { label: 'Nº PEDIDO', x: cx[0] + 2 },
   { label: 'DESCRIÇÃO DO BORDADO/CORTE', x: cx[1] + 2 },
   { label: 'QR CODE', x: cx[2] + 2 },
   { label: 'CHECK', x: cx[3] + 1 },
   ```

2. **Coluna 1 (Nº + Barcode)** — substitui o bloco atual que escreve só o número:
   ```ts
   // Barcode em cima
   try {
     const bcVal = orderBarcodeValue(o.numero, o.id);
     const bcImg = barcodeDataUrl(bcVal, { width: 1, height: 30 });
     if (bcImg) doc.addImage(bcImg, 'PNG', cx[0] + 2, y + 2, 38, 8);
   } catch {}
   // Nº do pedido escrito embaixo do barcode, centralizado
   doc.setFontSize(8);
   doc.setFont('helvetica', 'bold');
   doc.text(o.numero, cx[0] + cols[0] / 2, y + 14, { align: 'center' });
   doc.setFont('helvetica', 'normal');
   ```

3. **Descrição**: mantém `splitTextToSize(descText, cols[1] - 4)` e `doc.text(lines, cx[1] + 2, y + 4)`.

4. **QR code**: `doc.addImage(qr, 'PNG', cx[2] + 2, y + (rowH - 14) / 2, 14, 14)`.

5. **Check**: `doc.rect(cx[3] + (cols[3] - 5) / 2, y + (rowH - 5) / 2, 5, 5)`.

6. **Altura mínima da linha**: subir de 18 para **20mm** para acomodar barcode (8mm) + nº (≈4mm) confortavelmente:
   ```ts
   const rowH = Math.max(20, lines.length * 3 + 6);
   ```

### Resultado

```
+----------------------+----------------------+--------+-------+
|  [||||||||||||||]    | Cano: Crazy Horse Pr | [QR]   |  [☐]  |
|     7E-AB0001        | Gáspea: ...          |        |       |
+----------------------+----------------------+--------+-------+
```

### Fora do escopo

- Pesponto continua igual (já segue padrão próprio).
- Nenhuma mudança em filtros, ordenação, exportação ou banco.
- Sem alteração nas memórias automaticamente — se aprovar, atualizo `mem://features/reports/bordados-report-standards` e `mem://features/reports/corte-report-standards` para refletir o layout de 4 colunas com barcode+nº juntos.

### Arquivos editados

- `src/components/SpecializedReports.tsx` (apenas as duas funções).
