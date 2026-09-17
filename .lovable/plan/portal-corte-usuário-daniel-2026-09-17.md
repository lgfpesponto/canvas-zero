# Portal Corte (usuário Daniel)

## O que será criado

Um novo portal restrito, igual ao Portal Bordado, dedicado ao setor de corte, com um novo tipo de acesso "Portal Corte" e o usuário **daniel** (senha `danielc1`).

## Como vai funcionar

1. **Login e acesso**
   - Novo tipo de acesso "Corte (portal restrito)", disponível na tela de usuários.
   - Ao entrar, o Daniel cai direto na tela do corte; qualquer outro endereço redireciona para lá (só o perfil e o detalhe do pedido ficam liberados).

2. **Tela do corte** (mesmo visual do bordado, com o título "Portal Corte")
   - Botão laranja: escanear para **dar entrada** (o pedido vai para "Corte").
   - Botão verde: escanear para **dar baixa** (de "Corte" para "Baixa Corte").
   - Duas listas lado a lado: "Corte" e "Baixa Corte", cada uma com campo de busca/scanner e contador.
   - Botão de atualizar e o bloco "Resumo de baixas" com período e geração de PDF das baixas de corte.

3. **Regras de entrada**
   - Só entra pedido que estiver em **Impresso**.
   - Só entram produtos com ficha de produção: **bota e cinto**. Extras (gravata, bainha etc.) são recusados com aviso.
   - Pedido cancelado, já no corte ou em qualquer outra etapa é recusado com aviso sonoro e mensagem explicando em que etapa ele está.

4. **Regras de baixa e retrocesso**
   - Para ir a "Baixa Corte" o pedido precisa estar em "Corte".
   - Voltar de "Baixa Corte" para "Corte" exige justificativa, registrada no histórico do pedido, igual ao bordado.

5. **Listas**
   - A lista "Corte" mostra **todos** os pedidos nessa etapa, mesmo os que entraram por outra pessoa.
   - A lista "Baixa Corte" também mostra **todos** os pedidos nessa etapa.

6. **Detalhe do pedido**
   - Clicando em um pedido abre a mesma visão detalhada usada no bordado (ficha completa, foto, navegação entre pedidos e botão de ação da etapa), com os botões adaptados para Corte / Baixa Corte.

7. **Usuário**
   - Criação do usuário `daniel` com senha `danielc1` e o novo tipo de acesso.

## Detalhes técnicos

- Banco:
  - Novo valor `corte` no tipo `app_role`.
  - Função `corte_baixar_pedido(_order_id, _novo_status, _justificativa)` espelhando `bordado_baixar_pedido`: valida papel (`corte` ou `admin_master`), aceita só os status `Corte` e `Baixa Corte`, exige origem `Impresso` para entrada, exige `Corte` antes de `Baixa Corte`, exige justificativa no retrocesso e grava histórico.
  - Função `list_corte_usuarios()` (espelho de `list_bordado_usuarios`) para o cabeçalho do PDF.
  - Policies em `orders`: SELECT e UPDATE para `has_role(auth.uid(),'corte')` limitadas a `Impresso`, `Corte`, `Baixa Corte`.
  - A validação de tipo de produto (bota/cinto) é feita na função pela ausência de `tipo_extra` ou `tipo_extra = 'cinto'`.
- Front-end:
  - `src/pages/CortePortalPage.tsx` copiado da estrutura de `BordadoPortalPage.tsx`, com os status de corte, sem o filtro por autor da baixa.
  - `src/components/CorteOrderView.tsx` (ou reuso parametrizado de `BordadoOrderView`) para a visão detalhada, com botões "Marcar BAIXA Corte" / retrocesso.
  - `AppRole` em `AuthContext.tsx` ganha `corte`; `App.tsx` ganha rota `/corte` + `CORTE_ALLOWED`; `LoginPage.tsx` redireciona; `Header.tsx` esconde menus; `UsersManagementPage.tsx` lista o novo papel.
  - PDF: nova função em `pdfGenerators.ts` no mesmo formato do resumo de baixas do bordado, usando `find_orders_by_status_change` com `Baixa Corte`.
- Nada muda no fluxo atual de produção, preços ou pedidos existentes.
