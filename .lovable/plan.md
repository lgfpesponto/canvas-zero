## Problema

O WhatsApp (e outros crawlers como iMessage/Telegram/Slack) só lê o `<head>` estático do `index.html` porque o portal é uma SPA Vite. As meta tags que a `VitrinePublicaPage` injeta via JS depois do carregamento nunca são vistas pelo crawler — por isso o preview mostra só o domínio + a URL crua, sem título nem subtítulo.

Para o preview ficar com **título = nome da loja** e **subtítulo = "Produtos disponíveis em estoque"**, o HTML servido nessa URL precisa já vir com esses `<meta og:*>` prontos. Isso exige gerar HTML no servidor. Vamos usar uma edge function do Supabase (única forma server-side disponível no projeto).

## Solução

### 1. Nova edge function `vitrine-preview`
- Rota pública sem JWT (`verify_jwt = false` em `supabase/config.toml`).
- Recebe `?t=<token>` (o mesmo token base64url já usado hoje).
- Decodifica o token para extrair o `titulo` (nome da loja).
- Detecta se o requester é um crawler (User-Agent contém `whatsapp`, `facebookexternalhit`, `twitterbot`, `telegrambot`, `slackbot`, `linkedinbot`, `discordbot`, `bot`, `preview`, etc.).
  - **Crawler** → responde HTML mínimo com:
    - `<title>{titulo}</title>`
    - `<meta property="og:title" content="{titulo}">`
    - `<meta property="og:description" content="Produtos disponíveis em estoque">`
    - `<meta name="twitter:title" ...>` / `twitter:description`
    - `<meta property="og:type" content="website">`
    - Nenhum `og:image` (deixa hosting/Lovable injetar o default) para não regressar o comportamento atual.
  - **Browser normal** → responde `302` para `/vitrine/<token>` no domínio do portal, para o usuário final continuar caindo na SPA como hoje.
- Escapa `titulo` para evitar HTML injection (o token é gerado pelo próprio app, mas defensivo).

### 2. `CompartilharVitrineDialog.tsx`
- O link **exibido/copiado** passa a apontar para a edge function:
  `https://<project-ref>.functions.supabase.co/vitrine-preview?t=<token>`
- O botão "Abrir" continua abrindo o mesmo link (o redirect leva o usuário para a SPA).
- Nada mais muda no diálogo (título automático, sem WhatsApp button — já está assim).

### 3. Fallback estático em `index.html`
- Sem mudança: já tem `og:title="Rastreie a produção"` / description. A vitrine passa a ter meta próprio via edge function, então o fallback do index.html só afeta outras rotas.

### 4. `VitrinePublicaPage.tsx`
- Sem mudanças funcionais. Continua ajustando `document.title` e meta tags client-side (bom para a aba do navegador do usuário que abrir o link após o redirect).

## Detalhes técnicos

- Edge function é a única superfície server-side disponível — hosting Lovable serve SPA estática e não permite HTML dinâmico por rota.
- WhatsApp cacheia o preview por URL. Se um link já foi compartilhado antes desta mudança, o novo preview só aparece após o cache expirar ou usando o "WhatsApp Business API link preview refresh" (não temos). Para links novos, funciona de imediato.
- Nenhum banco novo, nenhuma tabela nova, sem migração.
- Sem alteração de RBAC ou de compra/desconto.

## Arquivos afetados

- **Novo:** `supabase/functions/vitrine-preview/index.ts`
- **Novo:** entry em `supabase/config.toml` com `verify_jwt = false` para `vitrine-preview`
- **Editado:** `src/components/estoque/CompartilharVitrineDialog.tsx` (troca da URL gerada)
