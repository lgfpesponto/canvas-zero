Aplicar no produto Cinto as mesmas regras de couro já usadas nas Botas e extras (Kit Faca, Bota Pronta Entrega etc.), e vincular "Nescau Chapado" a "Crazy Horse".

## Mudanças

### 1. `src/lib/orderFieldsConfig.ts`
Adicionar em `CORES_RESTRITAS`:
```ts
'Nescau Chapado': ['Crazy Horse'],
```
Efeito: "Nescau Chapado" só aparece quando o Tipo de Couro = Crazy Horse (em todos os campos que já usam `getCoresCouroFiltradas`: Bota Cano/Gáspea/Taloneira e extras).

### 2. `src/pages/BeltOrderPage.tsx` e `src/pages/EditBeltPage.tsx`
Hoje o Cinto usa `CORES_COURO` cru (lista completa, sem regras). Trocar para usar `getCoresCouroFiltradas(tipoCouro)`:
- importar `getCoresCouroFiltradas`
- substituir `options={CORES_COURO}` por `options={getCoresCouroFiltradas(tipoCouro)}`

Com isso o Cinto passa automaticamente a respeitar:
- "Estilizado em Madeira" → só permite Mostarda
- "Nescau Chapado" → só aparece em Crazy Horse
- demais restrições existentes (Vaca Holandesa, Metalizado, Nescau, Chocolate, Marrom etc.)

Nenhuma mudança de banco, preço ou pedidos existentes.