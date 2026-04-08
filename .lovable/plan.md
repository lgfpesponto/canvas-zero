

## Corrigir posicionamento dos bordados customizados na lista

### Problema

Novos bordados criados pelo admin via "+" são adicionados ao final da lista (após os "Bordado Variado"). O separador visual "Bordados Variados" aparece antes dos itens que começam com "Bordado Variado", mas como os custom options ficam depois, eles aparecem visualmente dentro do grupo de variados. Bordados customizados só devem entrar no grupo de variados se o nome começar com "Bordado Variado".

### Solução

Na construção das listas `mergedBordado*`, inserir os custom options ANTES dos itens "Bordado Variado", não no final:

**`src/pages/OrderPage.tsx`** e **`src/pages/EditOrderPage.tsx`**

Alterar a construção dos arrays merged para inserir custom options antes dos "Bordado Variado":

```typescript
const mergedBordadoCano = (() => {
  const custom = getByCategoria('bordado_cano').map(o => ({ label: o.label, preco: o.preco }));
  const variadoStart = BORDADOS_CANO.findIndex(i => i.label.startsWith('Bordado Variado'));
  if (variadoStart === -1) return [...BORDADOS_CANO, ...custom];
  // custom que NÃO são variados vão antes do separador; custom variados vão com os variados
  const customNormal = custom.filter(c => !c.label.toLowerCase().startsWith('bordado variado'));
  const customVariado = custom.filter(c => c.label.toLowerCase().startsWith('bordado variado'));
  return [
    ...BORDADOS_CANO.slice(0, variadoStart),
    ...customNormal,
    ...BORDADOS_CANO.slice(variadoStart),
    ...customVariado,
  ];
})();
```

Repetir para `mergedBordadoGaspea` e `mergedBordadoTaloneira` em ambos os arquivos. Criar helper reutilizável para evitar duplicação.

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/OrderPage.tsx` | Inserir custom options antes dos "Bordado Variado" na lista merged |
| `src/pages/EditOrderPage.tsx` | Mesmo ajuste |

