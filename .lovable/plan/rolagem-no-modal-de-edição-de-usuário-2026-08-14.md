# Rolagem no modal de edição de usuário

## Situação

Os modais de "Criar Novo Usuário" e "Editar Usuário" (aba Usuários das Configurações) usam o container padrão de diálogo, sem altura máxima nem área rolável. Como o formulário é longo (dados pessoais, loja, prefixo, senha, papel), o conteúdo ultrapassa a tela e não há como rolar — no celular e em telas menores no computador o final do formulário e os botões ficam inacessíveis.

## O que será feito

1. Limitar a altura dos modais de criar e editar usuário a ~90% da altura da tela.
2. Tornar o miolo do formulário rolável (rolagem vertical suave, inclusive em toque no celular), mantendo título e botões de ação sempre visíveis.
3. Aplicar o mesmo ajuste ao modal de confirmação de exclusão para consistência (mesmo sendo curto).
4. Conferir em tela estreita (390px) e em desktop que dá para rolar até o botão Salvar.

## Detalhes técnicos

- Arquivo: `src/pages/UsersManagementPage.tsx`.
- `DialogContent` com `max-h-[90dvh] flex flex-col` e o bloco de campos envolvido em `div` com `flex-1 overflow-y-auto overscroll-contain pr-1`.
- Header e footer fora da área rolável (`shrink-0`).
- Sem mudanças de banco, permissões ou lógica de negócio.
