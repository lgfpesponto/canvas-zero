

## Edição direta de todas as variações de bordado e laser

### Conceito

Migrar todas as variações de bordado e laser (atualmente hardcoded em `orderFieldsConfig.ts`) para a tabela `custom_options` no Supabase. O sistema passa a ser 100% orientado pelo banco de dados para esses campos. Quando o admin clica no lápis, cada linha se torna editável no lugar (nome e preço viram inputs), com botões Salvar/Cancelar no topo e um botão "Edição em massa" para ajustar todos os preços de uma vez.

### Etapas

**1. Migração de dados — SQL**

Inserir todas as variações estáticas de `orderFieldsConfig.ts` na tabela `custom_options` com as categorias corretas (`bordado_cano`, `bordado_gaspea`, `bordado_taloneira`, `laser_cano`, `laser_gaspea`, `laser_taloneira`). Incluir os preços individuais para laser (cano/gáspea = R$50, taloneira = R$0).

Serão ~90 registros (28 bordados cano + 26 gáspea + 19 taloneira + 22 laser x 3 regiões). Usar `ON CONFLICT` ou verificação para não duplicar se já existirem custom options.

**2. `src/lib/orderFieldsConfig.ts`**

Manter os arrays estáticos como fallback mas não usá-los mais diretamente nos MultiSelects de bordado/laser.

**3. `src/hooks/useCustomOptions.ts`**

Adicionar função `bulkUpdatePreco(categoria: string, increment: number)` que soma o incremento ao preço de todas as opções da categoria no Supabase e atualiza o estado local.

**4. `src/pages/OrderPage.tsx` — MultiSelect (refatoração completa)**

O componente passa a receber TODAS as variações via `customOptions` (vindas do banco) em vez de `items` estáticos para bordados/laser.

Modo edição (lápis):
- Cada item na lista mantém o checkbox mas o texto "Florência (R$25)" vira `☐ [Florência____] (R$[25])`
- Nome: input text editável inline
- Preço: input number editável inline, ao lado do nome
- Layout permanece na mesma posição do grid (sem col-span-full)
- Botão Trash2 ao lado de cada item customizado para exclusão

Topo do grid em modo edição:
```
[Salvar] [Cancelar] [Edição em massa]
```

Edição em massa:
- Ao clicar, aparece um campo inline "Adicionar valor: [___]" com botão confirmar
- Ao confirmar, soma o valor digitado a todos os preços da lista
- Atualiza o `editState` local (salva de fato só no "Salvar")

Salvar:
- Itera sobre todos os itens editados, chama `onUpdateOption` para cada um alterado
- Fecha modo edição

Cancelar:
- Descarta `editState`, fecha modo edição

Permissão:
- Lápis, edição em massa visíveis apenas para `isAdmin`

**5. `src/pages/EditOrderPage.tsx`**

Mesma refatoração do MultiSelect.

**6. Lógica de preço nos formulários**

Atualmente o cálculo de preço usa `items.find(i => i.label === sel)?.preco`. Com a mudança, usará `customOptions.find(o => o.label === sel)?.preco` — garantindo que preços editados no banco reflitam automaticamente.

**7. Compatibilidade com pedidos existentes**

Pedidos já criados armazenam o label do bordado/laser como texto no campo do pedido. O preço é recalculado na hora da exibição/relatório a partir da config atual. Isso significa que alterações de preço refletem em relatórios futuros, mas o label do pedido permanece intacto.

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| Migration SQL | Inserir todas variações estáticas na tabela `custom_options` |
| `src/hooks/useCustomOptions.ts` | Adicionar `bulkUpdatePreco` |
| `src/pages/OrderPage.tsx` | MultiSelect: edição inline de TODOS os itens, edição em massa, usar DB como fonte |
| `src/pages/EditOrderPage.tsx` | Mesma refatoração |

### Fluxo visual

```text
MODO NORMAL:
  Bordado do Cano          [+] [✏️]
  ┌──────────────────────────────┐
  │ ☐ Florência (R$25)          │
  │ ☐ Linhas (R$25)             │
  │ ☐ Peão Elite G (R$35)       │
  └──────────────────────────────┘

MODO EDIÇÃO (após clicar ✏️):
  Bordado do Cano          [+] [✏️]
  ┌──────────────────────────────┐
  │ [Salvar] [Cancelar] [Ed.massa]│
  │ ☐ [Florência___] R$[25] 🗑  │
  │ ☐ [Linhas______] R$[25] 🗑  │
  │ ☐ [Peão Elite G] R$[35] 🗑  │
  └──────────────────────────────┘

EDIÇÃO EM MASSA (após clicar):
  │ Adicionar valor: [+5] [OK]   │
  → Todos os preços somam +5
```

