## Correção: erro ao gerar Resumo de Baixas

### Diagnóstico

Os erros do console (`Cannot read properties of undefined (reading '0')` em `addFont` e `Cannot read properties of undefined (reading 'widths')` em `text`) acontecem dentro do `addFont`/`pdfEscape16` do jsPDF. Causa: o TTF do Montserrat não está chegando como base64 válido — `fetch(import.meta url)` em dev às vezes serve o arquivo com MIME/transformação errada, então o `addFont` engole sem lançar mas a fonte fica "meio registrada" e quebra o primeiro `doc.text`.

Resultado: o PDF de baixas quebra logo no primeiro `drawHeader()`.

### Correção

Em `src/lib/pdfGenerators.ts`, na função `generateBordadoBaixaResumoPDF`:

- Envolver a chamada `await registerMontserrat(doc)` em try/catch.
- Se falhar, manter `FONT = 'helvetica'` (built-in, sempre disponível) e seguir gerando o PDF normalmente.
- Logar o warning no console para diagnosticarmos depois.

Em `src/lib/pdfFonts.ts`, fortalecer o carregamento:

- Importar os TTF com `?arraybuffer` ao invés de `?url` + fetch — Vite resolve o binário direto, sem depender de MIME/transform do dev server.
- Converter o ArrayBuffer para base64 com a mesma função em chunks (já existe).

```ts
// src/lib/pdfFonts.ts
import regularBuf from '@/assets/fonts/Montserrat-Regular.ttf?arraybuffer';
import boldBuf from '@/assets/fonts/Montserrat-Bold.ttf?arraybuffer';
```

(Vite suporta `?arraybuffer` nativamente para assets binários; cai num import síncrono já com os bytes — fica `registerMontserrat` síncrono e mais confiável.)

### Resultado

- Se o Montserrat carregar: PDF sai com Montserrat.
- Se falhar por qualquer motivo (build, asset, etc.): PDF sai com Helvetica e o usuário consegue baixar o resumo normalmente, sem ficar travado.

### Arquivos tocados

- `src/lib/pdfFonts.ts` — trocar `?url` + fetch por `?arraybuffer`.
- `src/lib/pdfGenerators.ts` — try/catch no `registerMontserrat` com fallback Helvetica.
