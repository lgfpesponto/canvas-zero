## Diagnóstico

Corrigi o cálculo mas esqueci o **label das opções**. As listas renderizadas nos dropdowns "Tipo de Solado / Cor da Sola / Cor da Vira" ainda mostram o preço vindo das constantes hardcoded (`getSoladosForModelo`, `getCorSolaOptions`, `getCorViraOptions`), porque o `SelectField` faz `(R${item.preco})` a partir do objeto retornado por essas funções.

## Plano

Sobrescrever o `preco` de cada opção com o valor do banco antes de passar pro `SelectField`, mantendo o array/relacionamentos vindos de `orderFieldsConfig.ts`:

```ts
const withDbPrice = (opts, cat) =>
  opts.map(o => ({ ...o, preco: findFichaPrice(o.label, cat) ?? o.preco }));
```

Aplicar nas 3 linhas do JSX (~1877-1884) em `OrderPage.tsx`:
- Tipo de Solado → `withDbPrice(getSoladosForModelo(...), 'solado')`
- Cor da Sola → `withDbPrice(getCorSolaOptions(...)!, 'cor_sola')`
- Cor da Vira → `withDbPrice(getCorViraOptions(...), 'cor_vira')`

Nada muda nos relacionamentos (a estrutura vem intacta das funções originais) — só o número entre parênteses do label passa a refletir o banco. Rodar `tsgo` no fim.