

## Plano: Corrigir variações ausentes e manter formato visual original

### Problema

A migração anterior criou os campos corretamente na tabela `ficha_campos`, mas alguns campos ficaram **sem variações vinculadas**:
- **Gênero** → 0 variações (deveria ter: Feminino, Masculino)
- **Tipo do Metal** → 0 variações (deveria ter: Rebite, Bola Grande)
- **Cor do Metal** → 0 variações (deveria ter: Níquel, Ouro Velho, Dourado)
- **Tipo de Couro** → apenas 1 variação (deveria ter 20 tipos)

Além disso, o formato visual na página de configuração mudou (BootFieldRenderer genérico) quando deveria manter o formato original da versão publicada.

### O que fazer

**1. Migração SQL: inserir variações faltantes**

Inserir nas `ficha_variacoes` (com `campo_id` preenchido) as variações que faltam, buscando os dados de `orderFieldsConfig.ts`:

| Campo (slug) | Variações a inserir |
|---|---|
| `genero` | Feminino, Masculino |
| `tipo_metal` | Rebite, Bola Grande |
| `cor_metal` | Níquel, Ouro Velho, Dourado |
| `tipo_couro` | 19 tipos faltantes (Crazy Horse, Látego, Fóssil, etc.) |
| `cor_couro` | Verificar se tem todas as 31 cores |
| `modelo` | Verificar se tem todos os 21 modelos |

Também verificar e completar: `cor_glitter`, `cor_linha`, `cor_borrachinha`, `cor_vivo`, `formato_bico`, `solado`, `cor_sola`, `cor_vira`, `carimbo`, `desenvolvimento`, `acessorios`, `metais` (Área de Metal).

Cada variação usa `categoria_id` da categoria antiga inativa (para backward compat) + `campo_id` do campo visual novo.

**2. Restaurar formato visual do BootFormLayout**

O `BootFieldRenderer` atual renderiza de forma genérica. Restaurar para usar o mesmo visual da versão publicada (OrderPage):
- `selecao` → dropdown SearchableSelect (igual SelectField do OrderPage)
- `multipla` → grid de checkboxes com busca (igual MultiSelect do OrderPage)
- `checkbox` → toggle Tem/Não Tem com campo de texto condicional (igual ToggleField)
- `texto` → input text desabilitado
- `numero` → input number desabilitado
- `textarea` → textarea desabilitado

Manter os controles admin (renomear, reordenar ↑↓, editar variações, adicionar variação) mas com o layout visual idêntico ao formulário publicado.

**3. Atualizar dropdown do "+ campo"**

O dropdown de seções no diálogo "+ campo" ainda usa slugs técnicos antigos. Atualizar para usar as 16 categorias visuais ativas do banco de dados.

**4. Tipos de campo: manter os 6 existentes**

Os 6 tipos já existentes no banco (`texto`, `selecao`, `multipla`, `checkbox`, `numero`, `textarea`) cobrem todos os campos da ficha. Não criar tipos novos. Mapeamento:

| Componente no OrderPage | Tipo no banco |
|---|---|
| SelectField (dropdown) | `selecao` |
| MultiSelect (checkboxes) | `multipla` |
| ToggleField (Tem/Não tem) | `checkbox` |
| Input text | `texto` |
| Input number | `numero` |
| Textarea | `textarea` |

### Arquivos a editar

- **Migração SQL** — inserir variações faltantes para genero, tipo_metal, cor_metal, tipo_couro, etc.
- **`src/pages/AdminConfigFichaPage.tsx`** — restaurar BootFieldRenderer com layout visual original; atualizar dropdown "+ campo"
- **`src/hooks/useAdminConfig.ts`** — ajustar `useAllVariacoesByFichaTipo` para buscar variações por `campo_id`

