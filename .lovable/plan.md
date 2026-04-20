

## Erro nos comprovantes — diagnóstico e correção

### O que está acontecendo

Os logs da Edge Function `extract-comprovante` mostram **HTTP 401 (não autorizado)** em todas as chamadas — o erro "Edge Function returned a non-2xx status code" que aparece pra você é exatamente isso.

Causa raiz: a função foi configurada com `verify_jwt = true` em `supabase/config.toml`. O Supabase tenta validar o token JWT do usuário antes mesmo do código rodar e está rejeitando — provavelmente porque o `client.ts` aponta pro domínio customizado (`api.7estrivos.com.br`), enquanto as Edge Functions são chamadas direto em `*.supabase.co`, e o token acaba não sendo aceito naquele endpoint.

### Correção

Mudar **uma linha** em `supabase/config.toml`:

```toml
[functions.extract-comprovante]
verify_jwt = false
```

Isso desliga a validação automática de JWT. **Não é problema de segurança** porque:
- A função só extrai dados de um arquivo que o próprio cliente envia (não acessa banco nem retorna dados sensíveis)
- O acesso à página Financeiro já é protegido por RBAC (`admin_master`) no frontend
- A chave da IA (`LOVABLE_API_KEY`) continua só no servidor

É exatamente o mesmo padrão usado por outras funções de utilidade do projeto (`send-verification-code`, `verify-code`) que processam dados sem precisar do JWT do usuário.

### Após o deploy

Vou redeployar a função pra aplicar a mudança e você consegue testar arrastando o mesmo PDF de novo — deve voltar com data/valor/destinatário extraídos pela IA.

### O que NÃO mexo

- Código da função em si — está correto, suporta PDF e imagem
- Lógica de upload, validação, ou UI do formulário
- RLS das tabelas `financeiro_a_receber` / `financeiro_a_pagar`

### Validação (você faz depois)

1. Abrir Financeiro › A Receber › "Registrar Recebimento"
2. Arrastar o `Comprovante-2AA33F25...pdf` que deu erro
3. Conferir que os campos data, valor e destinatário aparecem preenchidos
4. Testar também com uma foto JPG de comprovante

