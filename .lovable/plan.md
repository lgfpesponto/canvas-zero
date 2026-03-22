

## Problem Diagnosis

There are **two issues** preventing login:

### 1. No users exist in auth.users
The Supabase `auth.users` table is empty. The `seed-users` edge function exists but was never invoked, so there are no accounts to log into. The login attempts for `7estrivos@7estrivos.app` return "Invalid login credentials" because the user simply does not exist.

### 2. Table name mismatch: `profiles` vs `Users`
The code references `supabase.from('profiles')` throughout `AuthContext.tsx` and `UsersManagementPage.tsx`, but the actual database table is named `Users` (capital U). This causes:
- All TypeScript build errors (the generated types don't know about a `profiles` table)
- Runtime failures when loading user profile data after login

---

## Plan

### Step 1: Rename the `Users` table to `profiles`
Create a migration to rename the table from `Users` to `profiles` so it matches all the code references. This is cleaner than changing all the code since `profiles` is the conventional name.

```sql
ALTER TABLE "Users" RENAME TO profiles;
```

### Step 2: Add a foreign key from profiles.id to auth.users(id)
The `profiles` table has an `id` column but no foreign key to `auth.users`. Add one so profile rows are tied to auth accounts.

```sql
ALTER TABLE profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

### Step 3: Add a trigger to auto-create profiles on signup
When a new user signs up via Supabase Auth, automatically insert a row into `profiles` using the metadata provided during registration.

### Step 4: Add RLS policies to profiles, orders, user_roles, verification_codes
Currently none of these tables have RLS policies. Add policies so:
- Users can read/update their own profile
- Admins can read all profiles
- Orders are visible to their owner and to admins
- user_roles readable by the user themselves

### Step 5: Run the seed-users edge function
Invoke the existing `seed-users` function to create the initial admin accounts (`7estrivos`, `fernanda`) and the demo user in `auth.users`, and insert corresponding rows into `profiles`.

### Step 6: Fix TypeScript types
After the migration runs, the Supabase types will auto-regenerate with the `profiles` table, resolving all build errors.

---

### Technical details

- The `Users` table columns (`id`, `nome_completo`, `nome_usuario`, `telefone`, `email`, `cpf_cnpj`, `verificado`, `created_at`) already match what the code expects from `profiles`
- The `seed-users` function creates auth users and assigns admin roles, but does NOT insert into `profiles` -- we need to update it or rely on the trigger
- The login flow constructs email as `${username}@7estrivos.app` and uses `signInWithPassword` -- this is correct once users exist

