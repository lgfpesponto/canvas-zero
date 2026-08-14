# Botões de editar/excluir usuário sempre visíveis

## Situação

Na aba Usuários (Configurações), os botões de editar e excluir não aparecem para o admin master.

O que já foi verificado no código e no banco:
- O botão de editar é renderizado sem nenhuma condição de permissão, e o de excluir só aparece para `admin_master` em usuários não protegidos (`7estrivos`, `fernanda`, `demo`).
- As permissões do banco estão corretas: admin pode atualizar perfis e cargos; a exclusão passa por função de servidor que valida admin master.

Ou seja: não é bloqueio de permissão. A coluna "Ações" é a sétima e última da tabela, e a tabela rola horizontalmente — em telas estreitas (a tela atual tem 906px de largura) a coluna dos botões fica fora da área visível. Esse é o diagnóstico provável e a primeira etapa é confirmá-lo em tela.

## O que será feito

1. **Confirmar em tela**: abrir a aba Usuários e verificar se a coluna "Ações" está apenas cortada pela rolagem horizontal.
2. **Coluna de ações fixa**: manter a coluna "Ações" grudada à direita da tabela, sempre visível mesmo com rolagem horizontal.
3. **Layout responsivo**: em telas estreitas, trocar a tabela por uma lista de cartões (nome, usuário, cargo, e-mail) com os botões Editar e Excluir sempre visíveis.
4. **Sinalização clara**: para os três usuários protegidos, em vez de simplesmente sumir o botão, mostrar o botão desabilitado com aviso "usuário protegido — não pode ser excluído", para não parecer bug.
5. **Reduzir aperto horizontal**: em telas médias, esconder colunas menos essenciais (CPF/CNPJ e Cadastro) para sobrar espaço às ações.

## Detalhes técnicos

- Arquivo único: `src/pages/UsersManagementPage.tsx` (mesmo componente usado em `/admin/configuracoes?tab=usuarios` via `UsersManagementInner`).
- Coluna de ações: `sticky right-0` com fundo sólido do tema e `z-10` na célula e no cabeçalho.
- Responsivo: `hidden md:table` para a tabela e uma lista de cards `md:hidden`, reaproveitando `openEdit` e `setDeleteProfile`.
- Colunas CPF/CNPJ e Cadastro com `hidden lg:table-cell`.
- Botão de excluir protegido: `disabled` + `title`, mantendo a regra de que só `admin_master` pode excluir.
- Nenhuma mudança de banco, RLS ou funções de servidor.
