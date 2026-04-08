

## Adicionar botao de editar (lapis) para gerenciar variacoes customizadas

### Conceito

Ao lado do botao "+", adicionar um icone de lapis (Pencil) visivel apenas para admins. Ao clicar, abre um painel inline listando as variacoes customizadas daquela categoria, permitindo editar nome/valor e excluir. Alteracoes sao salvas no Supabase e valem apenas para pedidos futuros (pedidos ja criados mantem os valores originais pois armazenam o label/preco no momento da criacao).

### Alteracoes

**1. `src/hooks/useCustomOptions.ts`**

Adicionar funcao `updateOption`:
```typescript
const updateOption = async (id: string, label: string, preco: number) => {
  const { error } = await supabase
    .from('custom_options').update({ label, preco }).eq('id', id);
  if (error) { toast.error('Erro ao atualizar'); return; }
  setOptions(prev => prev.map(o => o.id === id ? { ...o, label, preco } : o));
  toast.success('Opcao atualizada!');
};
```
Retornar `updateOption` no hook.

**2. `src/pages/OrderPage.tsx` e `src/pages/EditOrderPage.tsx`** — Componente `MultiSelect`

- Adicionar props: `customOptions?: CustomOption[]`, `onUpdateOption?`, `onDeleteOption?`
- Ao lado do botao "+", adicionar botao `Pencil` (lucide) que abre/fecha painel de edicao
- Painel lista apenas opcoes customizadas da categoria (nao as estaticas)
- Cada item mostra: input nome editavel, input valor editavel, botao salvar (Check icon), botao excluir (Trash2 icon)
- Ao salvar chama `onUpdateOption(id, newLabel, newPreco)` — atualiza no Supabase
- Ao excluir chama `onDeleteOption(id)` — remove do Supabase
- Passar as props de ambas as paginas usando `useCustomOptions`

**3. Passagem de props**

Onde `MultiSelect` e usado com `categoria`, passar tambem:
```typescript
customOptions={getByCategoria('bordado_cano')}
onUpdateOption={updateOption}
onDeleteOption={deleteOption}
```

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `src/hooks/useCustomOptions.ts` | Adicionar `updateOption`, exportar no retorno |
| `src/pages/OrderPage.tsx` | Botao lapis no MultiSelect, painel de edicao com editar/excluir |
| `src/pages/EditOrderPage.tsx` | Mesmas alteracoes do MultiSelect |

