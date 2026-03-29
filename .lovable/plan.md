

## Controle de criação de usuários e vendedor "Estoque"

### Resumo

Bloquear registro publico, remover paginas de cadastro/recuperar senha, adicionar criacao de usuarios pela admin na pagina Usuarios, e adicionar "Estoque" como vendedor especial.

### Alteracoes

#### 1. Remover rotas e links publicos de cadastro/recuperar senha

**`src/App.tsx`**:
- Remover rotas `/cadastro` e `/recuperar-senha`
- Remover imports de `RegisterPage` e `RecoverPasswordPage`

**`src/pages/LoginPage.tsx`**:
- Remover link "Esqueci minha senha" e "Criar conta"

**`src/contexts/AuthContext.tsx`**:
- Manter a funcao `register` (sera usada internamente pela admin) mas remover `recoverPassword` do contexto publico

#### 2. Criar edge function `create-user` para admin criar usuarios

**`supabase/functions/create-user/index.ts`**:
- Verificar que o caller e admin (mesmo padrao do `delete-user`)
- Receber: `nomeCompleto`, `nomeUsuario`, `email`, `cpfCnpj`, `senha`
- Usar `supabase.auth.admin.createUser()` com service role (mesmo padrao do seed-users)
- Email gerado: `${nomeUsuario}@7estrivos.app`
- Retornar o user criado

#### 3. Criar edge function `update-user-password` para admin alterar senha

**`supabase/functions/update-user-password/index.ts`**:
- Verificar admin
- Receber `userId` e `newPassword`
- Usar `supabase.auth.admin.updateUserById()` com service role

#### 4. Expandir `UsersManagementPage.tsx`

Adicionar ao topo um botao "Criar Usuário" que abre um Dialog com campos:
- Nome Completo, Nome de Usuario (login), Email, CPF/CNPJ, Senha
- Chamar edge function `create-user`

No dialog de editar, adicionar:
- Campo "Nome de Usuario" (editavel, atualiza `nome_usuario` no profiles)
- Campo "Nova Senha" (opcional — se preenchido, chama edge function `update-user-password`)

#### 5. Vendedor "Estoque" no formulario de pedido

**`src/pages/OrderPage.tsx`** (e `BeltOrderPage.tsx`, `ExtrasPage.tsx` se tiverem vendedor):
- Quando admin, adicionar opcao "Estoque" na lista de vendedores (alem dos perfis existentes)
- Quando "Estoque" e selecionado, o `user_id` do pedido sera o do proprio admin (Juliana)
- O campo `vendedor` no pedido tera valor `"Estoque"`

**`src/contexts/AuthContext.tsx`** (`addOrder`):
- Quando `vendedor === 'Estoque'`, manter `targetUserId = user.id` (admin) em vez de buscar perfil

**Visibilidade**: Ja funciona corretamente porque revendedores so veem seus proprios pedidos (RLS `user_id = auth.uid()`), e pedidos "Estoque" terao `user_id` do admin.

#### 6. Nao mexer nos usuarios existentes

Nenhuma migracao de dados. Todos os usuarios, senhas e perfis permanecem iguais.

### Detalhes tecnicos

- Edge functions usam `SUPABASE_SERVICE_ROLE_KEY` (ja configurado) para operacoes admin
- O padrao de email `${username}@7estrivos.app` e mantido
- A funcao `register` do AuthContext pode ser removida do contexto publico ja que a criacao sera via edge function
- Nao e necessaria nenhuma migracao de banco de dados

