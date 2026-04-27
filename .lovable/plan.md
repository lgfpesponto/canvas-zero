# Finalizar os 2 itens pendentes

## Estado atual (já implementado)
- ✅ `markTemplatesAsSeen` é chamado ao abrir o diálogo "Modelos" tanto em `OrderPage.tsx` (linha 1115) quanto em `BeltOrderPage.tsx` (linha 459) — o badge zera após a primeira visualização.
- ✅ Toast detalhado por remetente (`"Você recebeu 3 novos modelos transferidos: 2 de Maria, 1 de João"`) já existe em `OrderPage.tsx` (linhas 623-648), só que **conta TODOS os modelos** (botas + cintos).

## Falta apenas

### 1. Toast de modelos de **cinto** recebidos no `BeltOrderPage.tsx`
Atualmente o effect (linhas 153-159) só carrega templates, sem mostrar toast de transferidos.

**Alteração** — substituir o effect por uma versão que:
- Chama `tmpl.loadTemplates(user.id)`.
- Faz consulta direta a `order_templates` filtrando `user_id = user.id`, `seen = false` e `form_data->>__tipo = 'cinto'` para contar apenas modelos de cinto.
- Agrupa por `sent_by_name` e exibe `toast.success("Você recebeu N novo(s) modelo(s) de cinto transferido(s): X de Maria, Y de João", { duration: 8000 })`.

### 2. Filtrar o toast existente do `OrderPage.tsx` para contar **apenas modelos de bota**
Hoje a query (linhas 631-635) traz tudo e contabiliza cintos junto. Adicionar filtro para excluir os de cinto:
- Trazer também `form_data` no `select`.
- No `.filter`, manter apenas `(form_data?.__tipo) !== 'cinto'`.
- Ajustar a mensagem para `"...modelo(s) de bota transferido(s)..."` para deixar explícito.

Isso garante que cada página (bota / cinto) só notifica o vendedor sobre modelos do **seu próprio tipo**, sem dupla contagem nem mensagens enganosas.

## Arquivos a editar
- `src/pages/BeltOrderPage.tsx` — novo effect com toast detalhado para cintos
- `src/pages/OrderPage.tsx` — filtrar query existente por `__tipo !== 'cinto'` e ajustar texto

## Sem alterações de banco, sem novas migrations.
