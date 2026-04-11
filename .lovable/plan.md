

## Plano: Tornar "Preto" disponível para todos os tipos de couro

### Problema

A cor "Preto" está na lista exclusiva de "Vaca Holandesa", então a função `getCoresCouroFiltradas` remove "Preto" da lista geral para todos os outros tipos de couro.

### Solução

**Arquivo**: `src/lib/orderFieldsConfig.ts`

Na função `getCoresCouroFiltradas`, após calcular as cores exclusivas a remover, excluir "Preto" dessa remoção -- ou seja, "Preto" nunca é filtrado da lista geral, permanecendo disponível para qualquer tipo de couro.

Mudança pontual: na linha que filtra exclusivas, adicionar exceção:
```ts
const filtrada = base.filter(c => !exclusivas.includes(c) || c === 'Preto');
```

"Preto" continuará aparecendo também para Vaca Holandesa (já está na lista exclusiva dela).

