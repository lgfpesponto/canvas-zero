# Reorganizar canhoto da ficha impressa

## O que muda

Na ficha de produção (PDF A5), o canhoto inferior passa a ter **3 divisões iguais** em vez de 2, e o código de barras solto acima do tracejado é removido (esse espaço fica livre, sem novo conteúdo).

## Layout novo do canhoto

```
────────────── tracejado ──────────────
│                │                │                       │
│  [|||||||||]   │  [|||||||||]   │  Nº pedido: 30144     │
│    30144       │    30144       │  36 PVC P. PRETA      │
│                │                │  BF PONTA REDONDA     │
│                │                │  FORMA: 6761          │
```

- **Esquerda (1/3):** código de barras + número do pedido
- **Meio (1/3):** código de barras + número do pedido (idêntico — segundo canhoto destacável)
- **Direita (1/3):** 4 linhas na ordem:
  1. `Nº pedido: <numero>`
  2. `<tamanho> <tipo sola> <cor sola>` (ex: `36 PVC P. PRETA`)
  3. `<formato bico> <sola>` (ex: `BF PONTA REDONDA`)
  4. `FORMA: <numero>`

Duas linhas divisórias verticais separam os três blocos. Cabeçalho da ficha (dados do pedido, QR, categorias) permanece **inalterado**.

## Novas abreviações (aplicadas SÓ no canhoto, lado direito)

- **Solado**: `couro reta` → `couro`
- **Cor da sola**: `pintada de preto` → `P. PRETA`
- **Bico** (já existia): `fino` → `BF`

Demais valores seguem para UPPERCASE como hoje. As abreviações são restritas ao canhoto — em todo o resto do PDF/sistema os valores continuam por extenso.

## Arquivos afetados

- `src/lib/pdfGenerators.ts` — único arquivo (área ~linhas 530–590 da ficha individual).

## Detalhes técnicos

1. **Remover** bloco "CÓDIGO DE BARRAS SUPERIOR" (linhas 530–544).
2. **Substituir** `halfW = stubAreaW / 2` por `thirdW = stubAreaW / 3`; desenhar 2 divisórias verticais em `m + thirdW` e `m + 2*thirdW`.
3. **Blocos 1 e 2 (esquerda/meio):** barcode centralizado (largura ≈ `thirdW - 10mm`, altura 16mm) + número do pedido embaixo. Iguais entre si.
4. **Bloco 3 (direita):** 4 linhas na ordem definida, com `maxWidth = thirdW - 4mm`. Linha vazia é omitida sem deixar buraco (as presentes mantêm a ordem).
5. **Helpers de abreviação** (locais, dentro do bloco do canhoto):
   - `abbrevSolado(s)`: `'couro reta' → 'couro'`, caso contrário retorna o valor.
   - `abbrevCorSola(s)`: `'pintada de preto' → 'P. PRETA'`, caso contrário retorna o valor.
   - `abbrevBico(s)`: já existente (`fino → BF`).
   - Comparação case-insensitive, com `trim()`.
6. Margens internas ≥4mm em cada bloco para o barcode não ser cortado.

## Fora do escopo

- Nenhuma alteração na metade superior da ficha.
- Nenhuma alteração em outros PDFs ou na exibição em tela.
