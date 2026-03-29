

## Adicionar campo de pesquisa no dialog "Modelos"

### Alteração

**Arquivo**: `src/pages/OrderPage.tsx`

1. **Novo state**: Adicionar `templateSearch` (string, default `''`). Resetar ao abrir o dialog.

2. **Campo de pesquisa** (linhas 904-905): Após o `DialogTitle`, adicionar um `<Input>` com placeholder "Pesquisar modelo..." e value/onChange ligados a `templateSearch`.

3. **Filtrar lista** (linha 910): Filtrar `templates` pelo `templateSearch` antes do `.map()`:
   ```
   templates.filter(t => t.nome.toLowerCase().includes(templateSearch.toLowerCase()))
   ```
   Se nenhum resultado, mostrar mensagem "Nenhum modelo encontrado."

4. **Reset ao abrir**: No `onClick` do botão "Modelos" (linha 609), adicionar `setTemplateSearch('')`.

