## Objetivo
Criar um novo usuário/portal restrito para o setor **Montagem**, espelhando o comportamento do portal **Bordado**, mas focado na etapa "Montagem" do progresso de produção.

## 1. Banco de dados (migration)
- Adicionar novo valor `'montagem'` ao enum `app_role`.
- Criar usuário via `auth.admin.createUser` com:
  - login: `montagem` → email gerado `montagem@7estrivos.app`
  - senha: `montagem123`
  - nome_completo: `Montagem`
- Inserir role `montagem` em `user_roles` para esse usuário.
- Criar RPC `montagem_baixar_pedido(_order_id, _novo_status, _justificativa)` espelhada em `bordado_baixar_pedido`, operando nos status:
  - `Entrada Montagem` e `Baixa Montagem` (ou nomes equivalentes já existentes na etapa Montagem — vou conferir `status_etapas` antes de gerar a migration final).
- Permitir que `montagem` opere apenas em pedidos nessa fase + transição obrigatória Entrada → Baixa, com justificativa para retroceder, igual ao bordado.
- Atualizar `list_bordado_usuarios` (ou criar `list_montagem_usuarios`) se for usado em algum lugar.
- Ajustar RLS de `orders` para permitir leitura/update das colunas necessárias pelo role `montagem` (mesma lógica do bordado, restrita aos status de montagem).

## 2. Frontend
- **AuthContext / tipos** (`src/contexts/AuthContext.tsx`): adicionar `'montagem'` ao tipo de role.
- **App.tsx**:
  - Adicionar constante `MONTAGEM_ALLOWED` (rotas `/montagem`, `/perfil`, `/rastreio/...`).
  - Tratar `role === 'montagem'` em `ChromeWrapper` (esconde header, redireciona para `/montagem`), idêntico ao bordado.
  - Nova rota `/montagem` → `MontagemPortalPage`.
- **`src/pages/MontagemPortalPage.tsx`** (novo): clone do `BordadoPortalPage.tsx` adaptado:
  - Lista pedidos com status `Pespontando`/anterior elegível → permite "Entrada Montagem".
  - De `Entrada Montagem` → "Baixa Montagem".
  - Scan/busca por código de barras, PDF resumo, retroceder com justificativa.
  - Chama a nova RPC `montagem_baixar_pedido`.
- **`src/components/MontagemOrderView.tsx`** (novo, se necessário): clone simplificado de `BordadoOrderView` mostrando dados relevantes pra montagem.
- **Login** (`LoginPage`): após login, se role = `montagem`, redirecionar para `/montagem`.

## 3. Confirmações antes de gerar a migration
Preciso confirmar dois pontos para fechar a migration sem erro:

1. **Quais nomes exatos de etapa existem para Montagem hoje?** Hoje em `get_production_counts` vejo só `'Montagem'`. Para espelhar bordado (Entrada/Baixa), você quer que eu:
   - (a) **crie duas novas etapas** `Entrada Montagem` e `Baixa Montagem` em `status_etapas` (recomendado, espelha 100% o bordado), ou
   - (b) use **apenas a etapa `Montagem` existente** e o usuário só dá "baixa" (saída da montagem para a próxima etapa)?

2. **De qual etapa o usuário Montagem pode puxar pedidos para "Entrada Montagem"?** No bordado é a partir de `Baixa Corte`. Para montagem o natural seria a partir de `Pespontando` (última etapa de pesponto) — confirma?

Assim que você responder, gero a migration + os arquivos do portal.
