

## Remover "Bordado Variado" do relatório de Bordados — mostrar só descrição e cor

### Problema

No relatório de Bordados, quando o bordado selecionado é "Bordado Variado", o PDF mostra o nome "Bordado Variado" e possivelmente o valor. O correto é mostrar apenas a descrição personalizada digitada pelo vendedor e a cor do bordado.

### Alteração: `src/components/SpecializedReports.tsx` — `generateBordadosPDF`

**Linhas 755-764 (descrição de botas):** Ajustar a lógica para que, quando o valor de `bordadoCano`/`bordadoGaspea`/`bordadoTaloneira` contiver "Bordado Variado", substituir pelo campo de descrição correspondente (`bordadoVariadoDescCano`, etc.) junto com a cor, sem exibir o nome "Bordado Variado".

Lógica para cada região (Cano, Gáspea, Taloneira):

```typescript
// Cano
if (o.bordadoCano) {
  if (o.bordadoCano.includes('Bordado Variado')) {
    // Mostra só a descrição e cor
    if (o.bordadoVariadoDescCano) parts.push(`Cano: ${o.bordadoVariadoDescCano}`);
    if (o.corBordadoCano) parts.push(`Cor Cano: ${o.corBordadoCano}`);
  } else {
    parts.push(`Cano: ${o.bordadoCano}`);
    if (o.corBordadoCano) parts.push(`Cor Cano: ${o.corBordadoCano}`);
  }
}
// Remover a linha separada de bordadoVariadoDescCano pois já está incluído acima
```

Repetir o mesmo padrão para Gáspea e Taloneira.

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/components/SpecializedReports.tsx` | Substituir nome "Bordado Variado" pela descrição personalizada no relatório de Bordados |

