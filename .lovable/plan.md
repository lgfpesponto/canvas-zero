

## Plano: Campos editaveis, removiveis, obrigatorios e reordenaveis

### Problema atual
- Campos como "Observação", "Desenvolvimento", campos de texto (AdminTextRef), e toggles (AdminToggleField) nao tem opcao de editar nome, apagar ou marcar como obrigatorio
- As secoes do BootFormLayout estao hardcoded e nao podem ser reordenadas
- `sectionOrder` e `onMoveSection` existem mas estao com `void` (nao usados)

### Solucao

#### 1. Refatorar BootFormLayout para secoes reordenaveis
Transformar cada bloco (Header, Tamanho/Genero/Modelo, Sob Medida, Acessorios, Couros, Desenvolvimento, Bordados, Nome Bordado, Laser, Estampa, Pesponto, Metais, Extras, Solados, Carimbo, Adicional, Observacao) em um array de objetos com `id`, `title`, `render`. Usar `sectionOrder` para determinar a ordem de renderizacao. Setas up/down em cada secao movem a secao inteira (com todos os campos filhos).

#### 2. Adicionar controles a todos os campos
- **AdminTextRef**: ja tem pencil/delete, adicionar toggle "obrigatorio" (asterisco vermelho)
- **AdminToggleField**: ja tem pencil para nome/preco, adicionar botao de apagar e toggle obrigatorio
- **AdminSelectField**: adicionar pencil no label para renomear, botao apagar e toggle obrigatorio
- **AdminMultiSelect**: idem ao SelectField
- **Section**: ja tem pencil/delete, adicionar toggle obrigatorio no titulo

#### 3. Garantir que soma nao depende da ordem
A soma de precos ja e calculada no formulario de pedido (OrderPage) somando todos os campos preenchidos independentemente da posicao. A reordenacao so afeta a visualizacao, nao a logica de calculo. Nenhuma alteracao necessaria na logica de precos.

### Detalhes tecnicos

**Arquivo**: `src/pages/AdminConfigFichaPage.tsx`

**AdminToggleField** (linha 618):
- Adicionar props `onDelete` e `onToggleRequired` + estado `required`
- Mostrar botao Apagar no modo edicao
- Mostrar asterisco quando obrigatorio + switch para alternar

**AdminTextRef** (linha 662):
- Adicionar prop `required` e `onToggleRequired`
- Mostrar asterisco vermelho quando obrigatorio
- Mostrar switch no modo edicao para alternar obrigatoriedade

**AdminSelectField** (linha 512):
- Adicionar props `onRename`, `onDelete`, `onToggleRequired`
- Pencil no label para renomear, botao apagar, switch obrigatorio

**AdminMultiSelect** (linha 550):
- Mesmo tratamento do SelectField

**BootFormLayout** (linha 709):
- Definir array de secoes com chave e funcao render
- Usar `sectionOrder` (que ja existe no estado) para ordenar as secoes
- Ativar `onMoveSection` (ja existe mas esta com `void`) para trocar posicoes
- Cada Section recebe `onMoveUp`/`onMoveDown` usando o array reordenavel
- Ao mover uma Section tipo "Couros", todos os campos dentro dela movem junto

**Nota**: as alteracoes de nome/obrigatoriedade/exclusao nos campos da bota sao visuais no admin (preview). Para persistencia real, o sistema ja usa `ficha_campos` e `ficha_categorias` no banco. Os campos nativos da bota (hardcoded) nao precisam de persistencia de ordem pois a ordem visual e controlada pelo `sectionOrder` local.

