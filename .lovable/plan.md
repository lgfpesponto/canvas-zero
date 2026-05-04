Diagnóstico

Não: tirar o salvamento dos comprovantes no financeiro não deve resolver o problema principal do portal carregando infinitamente.

Por quê:
- O erro acontece já na rota `/login`, antes de o módulo financeiro entrar em cena.
- As últimas requisições mostram falha em autenticação e API do Supabase, não em Storage:
  - `POST /auth/v1/token?grant_type=refresh_token` → 504 `upstream request timeout`
  - `GET /rest/v1/revendedor_saldo_visibilidade` → 503 `Could not query the database for the schema cache`
- No console apareceu também erro de sessão concorrente:
  - `Lock "lock:sb-...-auth-token" was released because another request stole it`
- O volume atual de anexos é baixo, então não parece ser gargalo de storage:
  - `revendedor_comprovantes`: 64 registros
  - `financeiro_a_receber`: 64 registros
  - `storage.objects` no bucket `financeiro`: 64 arquivos

Então a hipótese mais forte hoje é:
1. sessão antiga/token inválido ou disputa de refresh no cliente, somado a
2. instabilidade do Auth/PostgREST do Supabase.

O que eu proponho implementar

1. Blindar o bootstrap de autenticação
- Ajustar `AuthContext` para evitar disputa entre `onAuthStateChange`, `getSession()` e refresh automático.
- Tratar explicitamente refresh token inválido/expirado: limpar a sessão local e mandar para login, em vez de deixar a app “carregando”.
- Garantir que nenhum wrapper global de `fetch` continue interferindo no auth.

2. Fazer fallback seguro quando o Supabase estiver instável
- Se `getSession()` ou refresh falhar por timeout/lock, encerrar o loading inicial e mostrar a tela de login normalmente.
- Exibir mensagem clara de indisponibilidade temporária, em vez de travar a interface.
- Evitar loops de retry que roubam o lock da sessão.

3. Só depois disso, revisar o financeiro opcionalmente
- Posso sim refatorar o fluxo dos comprovantes para “ler com IA e salvar só os dados”, sem manter o arquivo no Storage.
- Mas isso seria uma melhoria de produto/privacidade, não a correção do travamento principal.

Impacto da opção “não salvar comprovante”

Se você quiser mesmo essa mudança, eu adapto:
- `EnviarComprovanteDialog.tsx`
- `revendedorSaldo.ts`
- `ComprovanteViewer.tsx`
- telas de pendentes / histórico do financeiro
- RPCs e triggers que hoje assumem `comprovante_url`

Comportamento novo:
- IA extrai data, valor, destinatário e tipo
- o sistema grava apenas os campos estruturados + hash do arquivo
- não guarda PDF/imagem no bucket
- a conferência do admin passa a ser sem anexo visual

Trade-off importante:
- perde auditoria visual do comprovante
- perde possibilidade de reabrir e conferir o arquivo depois
- aumenta risco operacional se a IA extrair algo errado e não houver anexo para validar

Detalhes técnicos

Arquivos envolvidos no conserto principal:
- `src/contexts/AuthContext.tsx`
- `src/integrations/supabase/client.ts`
- `src/main.tsx`
- `src/lib/globalLoading.ts`
- possivelmente `src/pages/LoginPage.tsx`

Arquivos envolvidos na mudança opcional do financeiro sem anexo:
- `src/components/financeiro/saldo/EnviarComprovanteDialog.tsx`
- `src/components/financeiro/saldo/ComprovantesRevendedorPendentes.tsx`
- `src/components/financeiro/ComprovanteViewer.tsx`
- `src/pages/RevendedorSaldoPage.tsx`
- `src/components/financeiro/FinanceiroAReceber.tsx`
- `src/lib/revendedorSaldo.ts`
- migrations para remover dependência funcional de `comprovante_url`

Ordem recomendada

1. Corrigir o travamento de autenticação
2. Validar que login e carregamento voltaram
3. Se você ainda quiser, refatorar o financeiro para não armazenar anexos

Se aprovar, eu sigo nessa ordem para atacar a causa real primeiro e só depois faço a simplificação dos comprovantes.