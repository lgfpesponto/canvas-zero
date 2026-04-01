

## Resolver os 3 avisos de segurança restantes

### 1. Leaked Password Protection (manual)

Não é alteração de código. Ativar no painel do Supabase:
**Authentication → Settings → Leaked Password Protection → Enable**

### 2. Política DELETE para `verification_codes` (migração SQL)

```sql
CREATE POLICY "Users can delete own verification codes" ON verification_codes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

### 3. Restringir função `has_role` (opcional)

Alterar a função para não aceitar `_user_id` externo e sempre usar `auth.uid()`. Porém isso quebraria o uso atual nas policies que passam `auth.uid()` explicitamente — o scanner reconhece que não é diretamente explorável. **Recomendação: ignorar este aviso** pois as policies estão corretas e a função é `SECURITY DEFINER` read-only.

### Resumo

| Item | Ação | Tipo |
|------|------|------|
| Leaked Password Protection | Ativar no painel Supabase | Manual |
| verification_codes DELETE | Migração SQL | Automático |
| has_role _user_id | Sem alteração (falso positivo) | Ignorar |

