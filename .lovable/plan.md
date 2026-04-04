

## Bloquear "Fernanda ADM" como vendedor nos pedidos

### Problema

A usuária Fernanda ADM pode criar pedidos com ela mesma selecionada como vendedora. Ela deve ser obrigada a selecionar outro vendedor.

### Alterações

#### 1. `src/pages/OrderPage.tsx`

- **Inicialização (~linha 111):** Se `isFernanda`, iniciar `vendedorSelecionado` como `''` em vez de `user?.nomeCompleto`
- **Lista de vendedores (~linha 712-715):** Filtrar `allProfiles` para excluir o perfil da Fernanda (`p.nomeUsuario !== 'fernanda'` ou `p.nomeCompleto` diferente do nome da Fernanda)
- **Validação (~linha 422):** Adicionar validação: se `isFernanda` e vendedor vazio/igual ao nome dela, mostrar erro

#### 2. `src/pages/BeltOrderPage.tsx`

- **Inicialização (~linha 39):** Se `isFernanda`, iniciar `vendedor` como `''`
- **Lista de vendedores (~linha 278-280):** Filtrar perfil da Fernanda da lista
- **Validação no submit:** Bloquear se vendedor vazio

#### 3. `src/pages/ExtrasPage.tsx`

- **Inicialização:** Se `isFernanda`, não pré-selecionar o vendedor dela
- **Lista de vendedores (~linha 282):** Filtrar perfil da Fernanda
- **Validação no submit (~linha 189):** Bloquear se vendedor é o da Fernanda ou vazio

#### 4. `src/pages/EditExtrasPage.tsx`

- **Lista de vendedores (~linha 175):** Filtrar perfil da Fernanda (ela não pode trocar para ela mesma ao editar)

### Lógica de identificação

Usar `isFernanda` do `useAuth()` (já existe: `user?.nomeUsuario?.toLowerCase() === 'fernanda'`) e filtrar por `nomeCompleto` do user logado.

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/OrderPage.tsx` | Filtrar Fernanda da lista, iniciar vazio, validar |
| `src/pages/BeltOrderPage.tsx` | Filtrar Fernanda da lista, iniciar vazio, validar |
| `src/pages/ExtrasPage.tsx` | Filtrar Fernanda da lista, iniciar vazio, validar |
| `src/pages/EditExtrasPage.tsx` | Filtrar Fernanda da lista de vendedores |

