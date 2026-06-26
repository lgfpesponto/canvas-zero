## Reorganização visual do "Criar Modelo" + edição de modelos antigos

Aplicar em **OrderPage**, **BeltOrderPage** e **BordadoPortalPage** (todos os criadores de modelo).

### Nova ordem dos campos no modo template

1. **Link da Foto de Referência (Google Drive)** — label limpa, sem "(opcional — usada na ficha automática...)". Mantém ícone de link e input.
2. **Nome do Modelo** *
3. **Modelo** + **Gênero** lado a lado (grid 2 colunas).
4. **SKU base** *(quando o produto não varia por tamanho)* — remover "Bagy" do label e o prefixo "(opcional —".
5. **Tamanhos disponíveis + SKU** — bloco com apenas o título e o botão "+ Adicionar tamanho" na mesma linha. Remover o parágrafo explicativo e o texto "Nenhum tamanho cadastrado...". Quando vazio, fica só o header.
6. Demais seções (Couros etc.) seguem inalteradas.

### Foto lateral ao colar o link

Replicar o comportamento da Ficha de Pedido: assim que `templateFotoUrl` tiver valor, abrir o **`FotoPedidoSidePanel`** ao lado do formulário (mesmo layout grid 2 colunas). Fechar pelo X esconde até novo paste/edit. Reaproveitar o componente existente.

### Edição de modelos já criados

Ao clicar em **Editar** em um modelo existente, abrir nesta mesma nova visão reorganizada (já é o mesmo modo template — basta garantir que `startEditing` preencha `templateFotoUrl` e `templateTamanhosSkus`, o que já faz no `useTemplateManagement`). Verificar também `BeltOrderPage` e `BordadoPortalPage` — se a edição deles não popular esses campos novos hoje, ajustar para popular, mesmo que o modelo antigo venha com `foto_url=null` e `tamanhos_skus=[]`. O usuário poderá preencher os campos novos e salvar via `updateTemplate` (já grava esses campos).

### Padronização

Extrair o cabeçalho do template (foto + nome + modelo/gênero + SKU base + grade tamanhos) em um componente reutilizável `TemplateHeaderFields` em `src/components/template/`, para que OrderPage, BeltOrderPage e BordadoPortalPage compartilhem layout e comportamento idênticos (inclusive abertura da foto lateral e edição).

### Fora de escopo

- Lógica de salvar/atualizar template (já funciona).
- Campos abaixo de "Couros" em cada página.
- Mudanças no modo "pedido" (não-template).
