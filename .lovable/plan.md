## Objetivo

Quando qualquer vendedor clicar "Preencher" em um modelo salvo, o formulário deve puxar **tudo** que estava no modelo: campos técnicos (já funciona), gênero (já funciona) e também o **link da foto de referência**. Hoje o link da foto só é herdado por admin_master, admin_producao e usuário `site` — vendedores comuns ficam sem a foto.

Na edição de um modelo rascunho existente, ao abrir para editar, todos os campos (nome, SKU base, gênero, foto, tamanhos+SKU e campos técnicos) já são carregados via `tmpl.startEditing` no hook, então esse fluxo já está correto — nenhuma mudança necessária ali.

## Alterações

### 1) `src/pages/OrderPage.tsx` — `handleUseTemplate` (~linha 758-777)

Remover a checagem `canInheritTemplateFoto()` do bloco que aplica `template.foto_url`. Passa a herdar a foto para qualquer usuário logado:

```ts
if (template.foto_url) {
  setFotoUrl(template.foto_url);
  if (isHttpUrl(template.foto_url)) setMostrarFotoPainel(true);
}
```

A função `canInheritTemplateFoto` fica no arquivo apenas se ainda for usada em outro lugar; caso não seja, remover a declaração para não deixar código morto.

### 2) `src/pages/BeltOrderPage.tsx` — `handleUseTemplate` (~linha 230-244)

Mesma remoção da checagem `canInheritTemplateFoto()`. Herda a foto do modelo de cinto para qualquer vendedor.

### 3) Edição de modelo já criado

Nenhuma mudança de código. O fluxo `handleEditTemplate` → `tmpl.startEditing(template)` já popula nome, SKU base, gênero, link da foto, tamanhos+SKU e campos técnicos (`populateFormFromTemplate(template.form_data)`). Apenas confirmar visualmente que ao clicar no lápis de um modelo salvo, todos esses campos aparecem preenchidos no cabeçalho de modelo e nas variações.

## Fora de escopo

- Regras de quem pode enviar/receber modelos entre usuários.
- Estrutura da tabela `order_templates`.
- Fluxo do modo "criar novo modelo" (sem edição).
- Ajustes de foto em pedidos que **não** vieram de modelo.
