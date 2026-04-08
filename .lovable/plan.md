

## Botao "+" para criar variações de Bordado e Laser (somente admin)

### Conceito

Admins podem criar novas opcoes de bordado (com nome e valor) e laser (com nome, valor padrao) diretamente no formulario de producao, clicando em um botao "+" ao lado do titulo do campo. As novas variacoes ficam salvas no banco e disponiveis para todos os usuarios.

### Estrutura

**Nova tabela Supabase: `custom_options`**

```sql
create table public.custom_options (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,  -- 'bordado_cano', 'bordado_gaspea', 'bordado_taloneira', 'laser_cano', 'laser_gaspea', 'laser_taloneira'
  label text not null,
  preco numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.custom_options enable row level security;

create policy "Anyone authenticated can view" on public.custom_options for select to authenticated using (true);
create policy "Admins can insert" on public.custom_options for insert to authenticated with check (has_role(auth.uid(), 'admin'::app_role));
create policy "Admins can update" on public.custom_options for update to authenticated using (has_role(auth.uid(), 'admin'::app_role));
create policy "Admins can delete" on public.custom_options for delete to authenticated using (has_role(auth.uid(), 'admin'::app_role));
```

### Alteracoes

**1. Novo hook `src/hooks/useCustomOptions.ts`**

- Busca todas as `custom_options` ao montar
- Agrupa por `categoria`
- Expoe funcao `addOption(categoria, label, preco)` que insere no Supabase e atualiza estado local

**2. `src/pages/OrderPage.tsx`**

- Importar `useCustomOptions` e `isAdmin`
- Atualizar o componente `MultiSelect` para aceitar props opcionais `isAdmin`, `onAddOption`, `categoria` (tipo: bordado ou laser)
- Quando `isAdmin`, exibir botao "+" ao lado do label que abre um mini dialog inline com campos "Nome" e "Valor" (para bordados) ou apenas "Nome" (para laser, valor padrao conforme regiao: cano/gaspea = 50, taloneira = 0)
- Ao confirmar, salva no banco via `addOption` e a nova opcao aparece na lista imediatamente
- Na lista de items do MultiSelect, concatenar items estaticos (BORDADOS_CANO, etc.) + custom_options da categoria correspondente
- No calculo de preco (`bordadoPreco`, `laserPreco`), buscar preco tanto nos arrays estaticos quanto nos custom_options

**3. `src/pages/EditOrderPage.tsx`**

- Mesmas alteracoes: importar custom options, concatenar com arrays estaticos, botao "+" para admin

**4. Calculo de preco (ambas as paginas)**

- `bordadoPreco`: para cada bordado selecionado, buscar preco primeiro no array estatico, senao no custom_options
- `laserPreco`: idem, custom laser options usam preco padrao da regiao

### Fluxo do usuario admin

1. No campo "Bordado do Cano", ve um botao "+" ao lado do titulo
2. Clica, abre um mini formulario com "Nome do bordado" e "Valor (R$)"
3. Preenche e confirma — o novo bordado aparece na lista e fica salvo permanentemente
4. Para laser, o fluxo e igual mas sem campo de valor (usa o padrao da regiao)

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| Migration SQL | Criar tabela `custom_options` com RLS |
| `src/hooks/useCustomOptions.ts` | Novo hook para CRUD de opcoes customizadas |
| `src/pages/OrderPage.tsx` | MultiSelect com botao "+", concatenar opcoes customizadas, calculo de preco |
| `src/pages/EditOrderPage.tsx` | Mesmas alteracoes do OrderPage |

