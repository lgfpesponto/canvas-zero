## Canhoto da ficha na visão de pedido detalhado

Replicar exatamente o canhoto/stub que aparece no PDF da Ficha de Produção (`generateProductionSheetPDF`) dentro do bloco "Detalhes da Bota" da visão de pedido detalhado, em **todos os portais** (admin/vendedores e bordado).

### Visual alvo (igual ao PDF)
- Linha tracejada superior separando do conteúdo
- Lado esquerdo: código de barras CODE128 grande + número do pedido embaixo
- Divisória vertical
- Lado direito: "Nº pedido", linha de tamanho/solado/cor (e forma se houver), linha de bico/vira, e **QR Code da URL da foto** (escaneie para ver a foto)

Aparece **apenas para pedidos de bota** (sem `tipoExtra`). Extras/cinto não recebem stub.

### 1) Novo componente compartilhado: `src/components/FichaStub.tsx`

Componente único reutilizável que recebe `order: Order` e renderiza o canhoto. Internamente:
- Gera o código de barras com `JsBarcode` em um `<canvas>` → `toDataURL()` → `<img>`.
- Gera o QR com `qrcode.toDataURL(fotoUrl)` se houver foto válida (`isHttpUrl`).
- Usa exatamente as mesmas regras de texto do PDF (`orderBarcodeValue`, `tamanho`, `solado`, `corSola`, `forma`, `formatoBico` com `fino → BF`, `corVira` ignorando Bege/Neutra).
- Retorna `null` se `order.tipoExtra` (não-bota).

### 2) Inserir nas duas visões detalhadas

**`src/pages/OrderDetailPage.tsx`** (linha ~1192, dentro do `border border-border rounded-lg ... bg-background`, depois do bloco `columns-1 ... columns-3`):
```tsx
<FichaStub order={order} />
```

**`src/components/BordadoOrderView.tsx`** (linha ~325, no mesmo lugar — depois do bloco de categorias, antes de fechar a div com borda):
```tsx
<FichaStub order={order} />
```

Adicionar o import `import { FichaStub } from '@/components/FichaStub';` em ambos.

### Resultado
Ao abrir qualquer pedido de bota em qualquer portal, o bloco "Detalhes da Bota" passa a terminar com um canhoto visualmente igual ao da ficha impressa: barras + número à esquerda, info de montagem + QR da foto à direita.
