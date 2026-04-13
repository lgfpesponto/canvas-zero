

## Plano: Corrigir organização de categorias e campos na ficha de Bota

### Estado atual do banco

O banco tem **25 categorias granulares** (ex: `bordados-cano`, `tipos-couro`, `cor-linha`). Essas categorias estão corretas — elas são sub-itens que são agrupados nas **17 seções visuais** do formulário (ex: "Bordados" agrupa `bordados-cano`, `bordados-gaspea`, `bordados-taloneira`). Não é necessário alterar o banco.

### Mudanças em `src/pages/AdminConfigFichaPage.tsx`

**1. Mover "Nome Bordado" para dentro de "Bordados"**

Na seção 6 ("Bordados"), adicionar o `AdminToggleField` de "Nome Bordado" no final, abaixo dos bordados da taloneira. Remover a seção 7 como seção independente. Re-indexar as seções 8→7, 9→8, ..., 16→15. Total de seções fixas passa de 17 para 16.

**2. Dropdown do "+ campo" mostra seções visuais em vez de categorias DB**

Criar um mapeamento `BOOT_VISUAL_SECTIONS` que liga cada nome visual às categorias DB:

```text
"Tamanho / Gênero / Modelo" → tamanhos, generos, modelos
"Couros"                     → tipos-couro, cores-couro
"Bordados"                   → bordados-cano, bordados-gaspea, bordados-taloneira
"Laser"                      → laser-cano, laser-gaspea, laser-taloneira, cor-glitter
"Pesponto"                   → cor-linha, cor-borrachinha, cor-vivo
"Metais"                     → area-metal, tipo-metal, cor-metal
"Solados"                    → solados, formato-bico, cor-sola, cor-vira
"Acessórios"                 → acessorios
"Desenvolvimento"            → desenvolvimento
"Carimbo a Fogo"             → carimbo
+ categorias extras criadas dinamicamente
```

O dropdown terá dois níveis: primeiro seleciona a seção visual, depois (se a seção tiver múltiplas categorias DB) seleciona a sub-categoria específica (ex: "Bordado do Cano", "Bordado da Gáspea").

**3. Permitir mover campos dentro das categorias (↑/↓)**

Dentro de cada `AdminMultiSelect` e `AdminSelectField`, adicionar botões ↑/↓ nos itens para alterar a `ordem` no banco via `useUpdateVariacao`. Isso permite reorganizar a ordem dos campos dentro de cada categoria.

**4. Novas categorias no dropdown**

Categorias extras criadas via "+ categoria" serão automaticamente incluídas no dropdown do "+ campo" como opções adicionais.

**5. Atualizar `BOOT_SECTION_COUNT` e `sectionOrder`**

Ajustar para 16 seções fixas. A lógica de seções dinâmicas extras continua funcionando para categorias novas.

### Resultado

- "Nome Bordado" aparece como último campo dentro da seção "Bordados"
- O dropdown do "+ campo" mostra nomes das seções visuais da ficha (não os slugs técnicos do banco)
- Campos podem ser reordenados ↑/↓ dentro de cada categoria
- Novas categorias aparecem automaticamente no dropdown

