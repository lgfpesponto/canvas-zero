

## Plano: Corrigir campos de Couro e Glitter para refletir as 3 partes da bota

### Problema

A migração anterior criou campos genéricos únicos (`tipo_couro`, `cor_couro`, `cor_glitter`) quando na realidade o formulário publicado e a tabela `orders` usam campos separados por parte da bota:

| Campo atual (errado) | Campos corretos (como na versão publicada) |
|---|---|
| Tipo de Couro | Couro do Cano, Couro da Gáspea, Couro da Taloneira |
| Cor do Couro | Cor do Couro do Cano, Cor do Couro da Gáspea, Cor do Couro da Taloneira |
| Cor do Glitter | Cor do Glitter do Cano, Cor do Glitter da Gáspea, Cor do Glitter da Taloneira |

As colunas da tabela `orders` confirmam isso: `couro_cano`, `couro_gaspea`, `couro_taloneira`, `cor_couro_cano`, `cor_couro_gaspea`, `cor_couro_taloneira`, `cor_glitter_cano`, `cor_glitter_gaspea`, `cor_glitter_taloneira`.

### O que fazer

**1. SQL (insert tool): Substituir campos genéricos pelos campos por parte**

Na categoria "Couros":
- Desativar os campos genéricos `tipo_couro` e `cor_couro`
- Inserir 6 novos campos:
  - `couro_cano` (selecao), `couro_gaspea` (selecao), `couro_taloneira` (selecao)
  - `cor_couro_cano` (selecao), `cor_couro_gaspea` (selecao), `cor_couro_taloneira` (selecao)
- Cada um dos 3 campos de tipo couro recebe as mesmas 20 variações (TIPOS_COURO do orderFieldsConfig)
- Cada um dos 3 campos de cor couro recebe as mesmas 31 variações (CORES_COURO)

Na categoria "Laser":
- Desativar o campo genérico `cor_glitter`
- Inserir 3 novos campos:
  - `cor_glitter_cano` (selecao), `cor_glitter_gaspea` (selecao), `cor_glitter_taloneira` (selecao)
- Cada um recebe as mesmas 8 variações (COR_GLITTER)

**2. SQL (insert tool): Inserir variações faltantes nos outros campos**

Campos que já existem corretamente mas precisam de variações:
- `genero`: Feminino, Masculino
- `tipo_metal`: Rebite, Bola Grande
- `cor_metal`: Níquel, Ouro Velho, Dourado

**3. Frontend: Restaurar layout visual original**

`AdminConfigFichaPage.tsx` — O `BootFieldRenderer` deve renderizar cada campo usando o componente visual correto baseado no tipo, mantendo controles admin (renomear, reordenar, editar variações).

`useAdminConfig.ts` — Ajustar `useAllVariacoesByFichaTipo` para buscar variações via `campo_id`.

### Arquivos a editar
- SQL via insert tool (dados)
- `src/pages/AdminConfigFichaPage.tsx`
- `src/hooks/useAdminConfig.ts`

