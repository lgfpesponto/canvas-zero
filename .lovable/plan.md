

## Corrigir política INSERT da tabela `profiles`

### O que muda

Substituir a política atual aberta ao público por uma restrita a usuários autenticados inserindo apenas seu próprio perfil.

### Migração SQL

```sql
DROP POLICY "Service role can insert profiles" ON profiles;

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
```

### Por que funciona

- O trigger `handle_new_user` roda como `SECURITY DEFINER` e ignora RLS — continua criando perfis normalmente
- A Edge Function `create-user` usa service role key — também ignora RLS
- A nova política só permite que um usuário autenticado insira um perfil com seu próprio `id`, o que é seguro

### Nenhum outro arquivo precisa ser alterado

