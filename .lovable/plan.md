

## Plano: Remover edição/adição de variações do formulário de pedido da Bota

### Contexto
Os campos de Bordado e Laser no "Faça seu pedido" → Bota possuem botões de adicionar (+) e editar (✏️) variações inline. Essa funcionalidade agora está centralizada na página de Configurações → Ficha de Produção → Bota, então precisa ser removida do formulário de pedido.

### Alterações

#### 1. `src/pages/OrderPage.tsx`
- Remover as props de edição das 6 chamadas do `MultiSelect` (bordado_cano, bordado_gaspea, bordado_taloneira, laser_cano, laser_gaspea, laser_taloneira):
  - Remover: `isAdmin`, `categoria`, `onAddOption`, `customOptions`, `onUpdateOption`, `onDeleteOption`, `onBulkUpdatePreco`
- Se `useCustomOptions` não for mais usado por nenhum outro campo neste arquivo, remover o import e a chamada do hook

#### 2. `src/pages/EditOrderPage.tsx`
- Mesma remoção das props de edição nos 6 `MultiSelect` de bordados e laser
- Se `useCustomOptions` não for mais usado, remover import e chamada

#### 3. Componente `MultiSelect` (inline em ambos os arquivos)
- O componente continua existindo para seleção de opções, apenas não recebe mais as props de admin
- A lógica de add/edit/delete dentro do `MultiSelect` permanece no código (não quebra nada), mas simplesmente não será acionada pois as props não serão passadas

### O que NÃO muda
- O `MultiSelect` continua funcionando para **selecionar** variações
- As variações continuam vindo do banco (`useFichaVariacoesLookup`)
- Nenhum campo, layout ou fluxo do formulário é alterado
- A lógica de preços permanece intacta
- A tabela `custom_options` e o hook `useCustomOptions` continuam existindo para outros usos

