## Problema

Ao clicar em **Editar** no menu (⋮) de um modelo salvo dentro do dialog "Modelos Salvos", o formulário "Editar Modelo" abre corretamente com os dados preenchidos, mas fica **congelado**: não é possível alterar campos, salvar nem clicar em "Voltar para Pedido".

## Causa

Bug conhecido do Radix UI quando um **DropdownMenu** é fechado ao mesmo tempo em que o **Dialog** pai é fechado (o `startEditing` fecha o dialog `Modelos Salvos` imediatamente ao clicar em "Editar"). Nesse race condition o Radix não restaura o `pointer-events: none` que aplica no `<body>` durante o modal, deixando a página inteira sem receber cliques.

O mesmo problema não acontece com "Preencher" (botão fora do dropdown) nem com "Enviar/Excluir" (não trocam de tela).

## Correção

Em `src/components/template/TemplatesDialog.tsx`:

- No `DropdownMenuItem` de **Editar**, adiar `onEdit(t)` para o próximo tick com `setTimeout(..., 0)` (ou `requestAnimationFrame`). Isso deixa o Radix desmontar o dropdown e liberar o `pointer-events` do body antes do Dialog fechar e do modo template abrir.
- Aplicar o mesmo padrão em **Enviar modelo** e **Excluir** por consistência (evita o mesmo travamento futuro caso o handler passe a fechar o dialog).

Como reforço defensivo, adicionar em `src/index.css` uma regra:

```css
body[style*="pointer-events: none"] { pointer-events: auto !important; }
```

Isso garante que, mesmo se o Radix falhar em outra situação parecida, a página nunca fica congelada.

## Arquivos afetados

- `src/components/template/TemplatesDialog.tsx` — envolver `onEdit`/`onSend`/`onDelete` do dropdown em `setTimeout(fn, 0)`.
- `src/index.css` — regra de segurança contra `pointer-events: none` residual no `body`.

Nenhuma lógica de negócio ou dados é alterada — apenas a ordem de fechamento dos overlays.