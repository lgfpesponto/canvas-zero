

## Travar quantidade da Bota Pronta Entrega em 1

### O que muda

O campo "Quantidade" dentro de cada item de bota no formulário de Bota Pronta Entrega fica fixo em 1 e não pode ser editado manualmente. Para adicionar mais botas, o usuário usa o botão "+ 1 bota".

### Alterações

**`src/pages/ExtrasPage.tsx`**
- No formulário de `bota_pronta_entrega`, remover o input editável de quantidade de cada item ou torná-lo `disabled` com valor fixo `1`
- Garantir que `quantidade` sempre seja `'1'` no estado `botasPE`

**`src/pages/EditExtrasPage.tsx`**
- Mesmo ajuste: campo quantidade fixo em 1, não editável

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/ExtrasPage.tsx` | Campo quantidade fixo em 1, disabled ou hidden |
| `src/pages/EditExtrasPage.tsx` | Mesmo ajuste na edição |

