

## Plano: Adicionar cor "Madeira" ao campo cor do couro

### Solução

**Arquivo**: `src/lib/orderFieldsConfig.ts`

Adicionar `'Madeira'` ao array `CORES_COURO` (linha 66). A cor ficará disponível automaticamente em todos os formulários de pedido que utilizam esse campo.

```ts
// Linha 66 - antes:
'Caramelo','Preto e Branco',
// depois:
'Caramelo','Preto e Branco','Madeira',
```

Verificar também se "Madeira" precisa ser tratada como cor restrita (vinculada a tipos específicos). Como não há restrição indicada, ela ficará disponível para todos os tipos de couro.

