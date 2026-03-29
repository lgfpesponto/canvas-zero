

## Adicionar novos bordados variados

**Arquivo**: `src/lib/orderFieldsConfig.ts`

Seguindo o padrão dos existentes (`Bordado Variado R$5` e `Bordado Variado R$10`), adicionar ao final de cada array:

**`BORDADOS_CANO`**, **`BORDADOS_GASPEA`**, **`BORDADOS_TALONEIRA`** e **`BORDADOS`** (legado):
- `{ label: 'Bordado Variado R$15', preco: 15 }`
- `{ label: 'Bordado Variado R$25', preco: 25 }`
- `{ label: 'Bordado Variado R$30', preco: 30 }`
- `{ label: 'Bordado Variado R$35', preco: 35 }`

Nenhuma outra alteração — o `OrderPage.tsx` já renderiza a partir desses arrays.

