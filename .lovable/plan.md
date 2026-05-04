## Ajustes Portal Bordado

### 1. Lista — remover paginação, usar scroll contínuo (`BordadoPortalPage.tsx`)

- Remover `PAGE_SIZE`, estados `pageEntrada`/`pageBaixa`, props `page`/`onPageChange` em `BordadoColumn` e o bloco de paginação no rodapé da coluna.
- Substituir `visible = orders.slice(...)` por `visible = orders` (renderiza todos).
- Manter o `max-h-[60vh] overflow-y-auto` que já existe — o scroll vertical continua sendo feito dentro da própria coluna.
- A ordenação já vem por `data_criacao asc, hora_criacao asc` na query (mantida).

### 2. Navegação ◀ ▶ na visão de pedido detalhado quando vier do Portal Bordado (`useOrderNeighbors.ts`)

Hoje, ao abrir um pedido a partir do Portal Bordado, os botões de prev/next usam o escopo geral do usuário ordenado por `created_at DESC`. O usuário `bordado` precisa que a sequência siga **a mesma lista mostrada no portal** (status em `Entrada Bordado 7Estrivos` ou `Baixa Bordado 7Estrivos`, ordenado por `data_criacao asc, hora_criacao asc, id asc`).

Mudança em `src/hooks/useOrderNeighbors.ts`:
- Após `buildFiltersFromParams`, verificar `role === 'bordado'`. Se sim e não houver filtros na URL, montar uma query dedicada:
  ```
  supabase.from('orders').select('id')
    .in('status', ['Entrada Bordado 7Estrivos','Baixa Bordado 7Estrivos'])
    .order('data_criacao', { ascending: true })
    .order('hora_criacao', { ascending: true })
    .order('id', { ascending: true })
  ```
  paginando em batches de 1000.
- Setar `ids` com o resultado. O resto do hook (cálculo de `prevId`/`nextId` por `indexOf`) já funciona.
- Adicionar `role` à dependência do `useEffect`.

Resultado: na visão detalhada, ▶ avança para o próximo pedido da lista do bordado (ordem cronológica antiga → recente), respeitando exatamente o que aparece no portal.

### 3. PDF Resumo Comissão — incluir código de barras escaneável (`pdfGenerators.ts`, função `generateBordadoBaixaResumoPDF`)

Hoje o "código" mostrado abaixo do número é apenas texto (`barcodeOf` = últimos 12 chars do UUID em hex). Precisa de **barras reais** como nos outros PDFs.

- Reusar o helper `barcodeDataUrl(value, { width, height })` já existente.
- Para cada linha, renderizar o número do pedido em negrito + a imagem de barras logo abaixo (CODE128 do mesmo valor usado no scanner — usar `o.numero` ou o UUID curto, alinhado com `fetchOrderByScan`).
- Aumentar a altura da linha (`rowH`) de 9 para ~18 mm para acomodar barras (~10 mm) + número. Largura ~45 mm a partir de `colNum`.
- Realinhar `colTipo`/`colCom`/`colEntrada` para começarem após a área das barras e centralizar verticalmente o texto.
- Ajustar `ensureSpace(rowH + 2)` para o novo `rowH`.
- Manter cabeçalhos por dia, subtotal, totais finais e datas.

### 4. Trocar fonte do PDF para Montserrat

jsPDF usa Helvetica por padrão (built-in). Para usar Montserrat é necessário **embutir o TTF** via `doc.addFileToVFS` + `doc.addFont`.

- Adicionar arquivos `Montserrat-Regular.ttf` e `Montserrat-Bold.ttf` em `src/assets/fonts/` (download em google fonts; Apache 2.0 — peso ~400 KB combinado).
- Criar helper `src/lib/pdfFonts.ts` que importa os arquivos como base64 (via `?url` + fetch ou `?raw` em build) e registra a fonte no `doc`:
  ```ts
  export function registerMontserrat(doc: jsPDF) {
    doc.addFileToVFS('Montserrat-Regular.ttf', regularBase64);
    doc.addFont('Montserrat-Regular.ttf', 'Montserrat', 'normal');
    doc.addFileToVFS('Montserrat-Bold.ttf', boldBase64);
    doc.addFont('Montserrat-Bold.ttf', 'Montserrat', 'bold');
    doc.setFont('Montserrat', 'normal');
  }
  ```
  (carregamento via `import url from '@/assets/fonts/...?url'` + `fetch` → `arrayBuffer` → base64; função se torna `async` e o registro acontece uma única vez por `doc`).
- Em `generateBordadoBaixaResumoPDF`:
  - Tornar a função `async`.
  - Chamar `await registerMontserrat(doc)` antes de qualquer `setFont`.
  - Substituir todos os `doc.setFont('helvetica', ...)` por `doc.setFont('Montserrat', ...)`.
- Atualizar o `await` em `BordadoPortalPage.gerarPDF` (já dentro de `async` — basta `await`).
- **Escopo**: aplicar Montserrat **apenas** neste PDF agora (é o que o usuário pediu para testar). Se ficar bom, depois propagamos para os demais.

### Arquivos tocados

- `src/pages/BordadoPortalPage.tsx` — remover paginação.
- `src/hooks/useOrderNeighbors.ts` — branch para `role === 'bordado'`.
- `src/lib/pdfGenerators.ts` — barcode + Montserrat na função do resumo.
- `src/lib/pdfFonts.ts` (novo) — registro do Montserrat.
- `src/assets/fonts/Montserrat-Regular.ttf` e `Montserrat-Bold.ttf` (novos).
