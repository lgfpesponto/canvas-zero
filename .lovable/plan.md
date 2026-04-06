

## Ordenação por tipo de couro com prioridade definida

### Problema

Atualmente os 3 relatórios (Fichas de Produção, Corte e Bordados) ordenam por couro usando `localeCompare` simples (ordem alfabética). O usuário quer uma ordem específica de prioridade por tipo de couro, agrupando por cor dentro de cada tipo.

### Ordem de prioridade dos couros

1. Crazy Horse (todas as cores juntas)
2. Látego (todas as cores juntas)
3. Nobuck (todas as cores juntas)
4. Fóssil (todas as cores juntas)
5. Floater (todas as cores juntas)
6. Napa Flay (todas as cores juntas)
7. Demais couros (agrupados por tipo e cor)

### Solução

Criar uma função utilitária `getCouroSortKey(tipoCouro: string): number` que retorna a prioridade numérica do couro. Usar essa função nos 3 pontos de ordenação.

### Alterações

**Arquivo: `src/lib/pdfGenerators.ts`**

- Adicionar função `getCouroSortKey` no topo
- Linhas 58-65: Substituir `localeCompare` simples por comparação usando `getCouroSortKey` para o tipo de couro, depois `localeCompare` para a cor, depois número do pedido

**Arquivo: `src/components/SpecializedReports.tsx`**

- Importar ou duplicar `getCouroSortKey`
- Linhas 858-870 (Corte): Substituir `keyA.localeCompare(keyB)` por comparação com prioridade de couro + cor
- Linhas 758-779 (Bordados): Adicionar ordenação por couro (tipo+cor) como critério principal para botas, mantendo agrupamento por bordado como secundário

### Lógica da função

```typescript
const COURO_PRIORITY: Record<string, number> = {
  'crazy horse': 1,
  'látego': 2, 'latego': 2,
  'nobuck': 3,
  'fóssil': 4, 'fossil': 4,
  'floater': 5,
  'napa flay': 6,
};

function getCouroSortKey(tipo: string): number {
  return COURO_PRIORITY[tipo.toLowerCase().trim()] ?? 99;
}
```

Comparação: prioridade do tipo → cor (localeCompare) → número do pedido

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `src/lib/pdfGenerators.ts` | Adicionar `getCouroSortKey`, usar na ordenação das fichas de produção |
| `src/components/SpecializedReports.tsx` | Usar mesma lógica de prioridade na ordenação do Corte e Bordados |

