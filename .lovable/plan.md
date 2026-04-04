

## Incluir cintos no Relatório de Bordados e ordenar por bordado

### Problema

O relatório de Bordados filtra apenas botas (verifica campos `bordadoCano`, `bordadoGaspea`, etc.). Pedidos de cinto com bordado (`bordadoP === 'Tem'/'Sim'` ou `nomeBordado === 'Tem'/'Sim'` no `extraDetalhes`) não aparecem. Além disso, a ordenação atual é por número do pedido — precisa agrupar bordados iguais juntos.

### Alteração: `src/components/SpecializedReports.tsx` — `generateBordadosPDF`

#### 1. Filtro (linhas 680-690)

Adicionar condição para incluir cintos que tenham bordado:

```typescript
if (o.tipoExtra === 'cinto') {
  const det = (o.extraDetalhes as any) || {};
  return det.bordadoP === 'Tem' || det.bordadoP === 'Sim' || det.nomeBordado === 'Tem' || det.nomeBordado === 'Sim';
}
```

#### 2. Descrição do bordado para cintos (linhas 718-731)

Adicionar lógica condicional — quando `o.tipoExtra === 'cinto'`, montar descrição com dados do `extraDetalhes`:

```typescript
if (o.tipoExtra === 'cinto') {
  const det = (o.extraDetalhes as any) || {};
  parts.push('CINTO');
  if (det.bordadoP === 'Tem' || det.bordadoP === 'Sim') {
    parts.push(`Bordado P: ${det.bordadoPDesc || ''} ${det.bordadoPCor || ''}`);
  }
  if (det.nomeBordado === 'Tem' || det.nomeBordado === 'Sim') {
    parts.push(`Nome: ${det.nomeBordadoDesc || ''}${det.nomeBordadoCor ? ' cor: ' + det.nomeBordadoCor : ''}${det.nomeBordadoFonte ? ' fonte: ' + det.nomeBordadoFonte : ''}`);
  }
} else {
  // lógica atual de bota
}
```

#### 3. Ordenação (linha 716)

Substituir a ordenação por número por uma que agrupe bordados iguais juntos (botas primeiro, cintos depois), similar ao relatório de Corte:

```typescript
filtered.sort((a, b) => {
  const isBeltA = a.tipoExtra === 'cinto' ? 1 : 0;
  const isBeltB = b.tipoExtra === 'cinto' ? 1 : 0;
  if (isBeltA !== isBeltB) return isBeltA - isBeltB;

  if (!isBeltA) {
    // Botas: agrupar por bordado do cano (principal identificador)
    const keyA = `${a.bordadoCano || ''}|${a.corBordadoCano || ''}|${a.bordadoGaspea || ''}|${a.corBordadoGaspea || ''}`;
    const keyB = `${b.bordadoCano || ''}|${b.corBordadoCano || ''}|${b.bordadoGaspea || ''}|${b.corBordadoGaspea || ''}`;
    const cmp = keyA.localeCompare(keyB);
    if (cmp !== 0) return cmp;
  } else {
    // Cintos: agrupar por tipo de bordado
    const detA = (a.extraDetalhes as any) || {};
    const detB = (b.extraDetalhes as any) || {};
    const keyA = `${detA.bordadoPDesc || ''}|${detA.bordadoPCor || ''}`;
    const keyB = `${detB.bordadoPDesc || ''}|${detB.bordadoPCor || ''}`;
    const cmp = keyA.localeCompare(keyB);
    if (cmp !== 0) return cmp;
  }

  const numA = parseInt(a.numero.replace(/\D/g, ''), 10) || 0;
  const numB = parseInt(b.numero.replace(/\D/g, ''), 10) || 0;
  return numA - numB;
});
```

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/components/SpecializedReports.tsx` | Filtro inclui cintos com bordado, ordenação agrupa bordados iguais, descrição adaptada para cintos |

