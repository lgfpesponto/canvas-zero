

## Plano: Alinhar visual dos campos na configuracao com o formulario publicado

### Problema

Na aba configuracao > ficha de producao > bota, o `BootFieldRenderer` renderiza todos os campos de forma incorreta comparado ao formulario "Faca seu Pedido":

| Tipo | OrderPage (correto) | Admin Config (atual) |
|---|---|---|
| `selecao` | `SearchableSelect` (dropdown com busca) | Radio buttons em caixa bordada |
| `multipla` | Grid de checkboxes em caixa com busca | Similar, mas sem separador "Bordados Variados" |
| `checkbox` | Select "Tem/Nao tem" + campo texto condicional | Select desabilitado sem indicacao de texto condicional |

### Alteracoes

**Arquivo: `src/pages/AdminConfigFichaPage.tsx`** - funcao `BootFieldRenderer`

1. **Tipo `selecao`**: Trocar o grid de radio buttons por um `SearchableSelect` desabilitado (preview) mostrando as variacoes como opcoes. Manter os botoes admin (adicionar, editar variacoes) acima do componente.

2. **Tipo `multipla`**: Manter o grid de checkboxes (ja esta similar ao OrderPage), mas adicionar o separador "Bordados Variados" quando aplicavel, igual ao MultiSelect do OrderPage.

3. **Tipo `checkbox`**: Ja renderiza como select "Tem/Nao tem" (correto), mas adicionar preview do campo de texto condicional quando `desc_condicional = true`, mostrando um input desabilitado ao lado igual ao OrderPage.

### Detalhes tecnicos

- O `SearchableSelect` para tipo `selecao` recebera as variacoes como `options` (array de strings com os nomes)
- Os botoes de admin (Plus, Pencil para variacoes, Dialog de edicao) continuam acima do componente visual
- Para `checkbox` com `desc_condicional`, adicionar um `<input disabled placeholder="(campo de texto se Tem)">` ao lado do select

