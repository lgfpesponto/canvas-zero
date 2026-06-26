## Objetivo

Ao usar um modelo rascunho com "Preencher", herdar os novos campos do cabeçalho do modelo (`gênero` e `link da foto`) no formulário do pedido. O link da foto, por ser usado pela ficha automática da Bagy, só herda para usuários autorizados.

## Mudanças

### 1. `src/pages/OrderPage.tsx` — `handleUseTemplate`
Hoje a função recebe o template completo e chama apenas `validateAndPopulateTemplate(form_data)`, que ignora os campos do cabeçalho. Adicionar, após o populate:

- `setGenero(template.genero || '')` quando vier preenchido (sobrescreve só se o template trouxer valor).
- `setFotoUrl(template.foto_url)` **apenas** se `canInheritTemplateFoto(user)`.

Para a Bagy não muda nada — o `bagyPrefill` já força o vendedor "site" e a própria foto vem do pedido Bagy.

### 2. `src/pages/BeltOrderPage.tsx` — `handleUseTemplate`
Cinto não tem campo `gênero`. Aplicar somente:
- `setFotoUrl(template.foto_url)` quando `canInheritTemplateFoto(user)`.

### 3. Helper de permissão
Adicionar utilitário inline (ou em `src/lib/order-logic.ts`):

```ts
function canInheritTemplateFoto(user) {
  if (!user) return false;
  if (user.role === 'admin_master' || user.role === 'admin_producao') return true;
  if (user.nomeUsuario === 'site') return true; // Rancho Chique
  return false;
}
```

Para os demais usuários (vendedores normais, bordado etc.) o campo "Link da Foto" permanece como o usuário deixou — não é sobrescrito pelo modelo.

## Fora de escopo
- Não muda a edição do próprio modelo (`handleEditTemplate`), que já carrega o cabeçalho via `tmpl.startEditing` para o painel de edição do modelo.
- Não altera fluxo da Bagy nem regra de SKU.
- Não muda o que é salvo no pedido — só o que é preenchido na tela.
