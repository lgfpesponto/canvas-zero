## Diagnóstico

No PDF da imagem, o pedido **não tem desconto ativo no momento** (`o.desconto === 0`) — a última alteração foi justamente "voltando pro valor original" (zerou o desconto que existia antes). Por isso:

1. **Linha "Desconto R$ X,XX" não aparece** → o bloco `if (o.desconto && o.desconto !== 0)` não dispara, então não adiciona a linha em `priceItems`.
2. **Sem coloração** → como a palavra "Desconto" não vira linha própria, o overlay colorido também não roda. A palavra só aparece dentro do texto do motivo (`"Desconto aplicado: R$ 10,00 — voltando pro valor original"`).

A ordem (Desconto/Acréscimo → valor → motivo) **já está correta** no código atual quando há desconto ativo: `priceItems` empilha "Desconto R$ X,XX" antes de `justifLines` ("Motivo: ..."). Você pode confirmar isso testando um pedido com desconto != 0.

## Mudança proposta

Tornar a coloração robusta para os dois casos no PDF de cobrança (`generateCobrancaPDF` em `src/components/SpecializedReports.tsx`):

### 1. Caso já implementado — desconto/acréscimo ativo
Mantém a linha "Desconto R$ X,XX" (vermelho) ou "Acréscimo R$ X,XX" (verde) antes do motivo. Já funciona.

### 2. Novo — quando o motivo menciona Desconto/Acréscimo mesmo sem valor ativo
Detectar a palavra "Desconto" ou "Acréscimo" dentro da linha "Motivo: ..." e colorir só essa palavra (vermelho/verde) onde ela aparece, calculando o offset X via `doc.getTextWidth(prefix)`.

```ts
// Após desenhar `lines` em preto:
(lines as string[]).forEach((line, idx) => {
  const lineY = y + 4 + idx * 3;
  // 1) Linha que começa com Desconto/Acréscimo (valor ativo)
  if (line.startsWith('Desconto')) {
    doc.setTextColor(220, 38, 38);
    doc.text('Desconto', cx[2] + 1, lineY);
    doc.setTextColor(0, 0, 0);
    return;
  }
  if (line.startsWith('Acréscimo')) {
    doc.setTextColor(22, 163, 74);
    doc.text('Acréscimo', cx[2] + 1, lineY);
    doc.setTextColor(0, 0, 0);
    return;
  }
  // 2) Palavra dentro do motivo (sem valor ativo ou em qualquer lugar)
  const m = line.match(/(Desconto|Acréscimo)/i);
  if (m) {
    const word = m[1];
    const before = line.substring(0, m.index!);
    const xOffset = cx[2] + 1 + doc.getTextWidth(before);
    if (/^acréscimo/i.test(word)) doc.setTextColor(22, 163, 74);
    else doc.setTextColor(220, 38, 38);
    doc.text(word, xOffset, lineY);
    doc.setTextColor(0, 0, 0);
  }
});
```

E removo o bloco antigo de overlay (que só pegava `lineIdx` da primeira linha começando com a palavra).

## Confirmação sobre ordem

A ordem no código já é: `[itens... , Desconto/Acréscimo R$ X, Motivo: ...]`. Se você testar um pedido com desconto/acréscimo ativo e ainda vir ordem diferente, me mande print desse caso específico — pode ser outro detalhe.

Posso aplicar?