

## Plano: Adicionar Modelos e Campos Finais ao Admin da Bota

### Contexto
A página admin da bota precisa ter os botões "Criar Modelo" e "Modelos" no topo, e os campos "Quantidade", "Prazo de Produção" e "Valor Total" no final -- igual a versão publicada (`OrderPage.tsx`). A estrutura de edição existente (editar, mover, relacionar, adicionar) permanece intocada.

### Alterações

#### 1. Botões "Criar Modelo" e "Modelos" no header (apenas bota)
- No bloco de botões admin (linhas ~2107-2143), adicionar dois botões antes dos existentes:
  - **"Criar Modelo"** — redireciona para `/pedido` com modo template (`?mode=template`)
  - **"Modelos"** — abre dialog de modelos usando `useTemplateManagement`, exibindo lista de modelos salvos com opção de editar/excluir
- Importar `useTemplateManagement`, ícones `List` (já importado como parte do projeto)

#### 2. Campos Quantidade, Prazo e Valor Total no final do BootFormLayout
- Após o loop de categorias no `BootFormLayout` (linha ~1031), adicionar uma seção final com:
  - **Quantidade**: input numérico readonly com valor 1, estilo igual ao OrderPage
  - **Prazo de Produção**: box informativo "15 dias úteis"
  - **Valor Total**: box com "R$ 0,00" (visual, sem cálculo real no admin)
- Todos com `opacity-60 pointer-events-none` para indicar que são apenas preview no modo admin

#### 3. Nenhuma alteração na lógica de edição existente
- `BootFieldRenderer`, `editDialog`, relacionamentos, fallback, reordenação -- tudo permanece como está

### Arquivo modificado
- `src/pages/AdminConfigFichaPage.tsx`

### Detalhes técnicos
- Importar `useTemplateManagement` de `@/hooks/useTemplateManagement`
- Adicionar estado para dialog de modelos no componente principal `AdminConfigFichaPage`
- Os botões de modelo ficam no mesmo `div` dos botões "+ campo", "+ categoria", "sincronizar"
- Campos finais são JSX estático dentro do retorno do `BootFormLayout`, após `{visualCats.map(...)}`

