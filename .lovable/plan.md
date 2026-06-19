# Link público de acompanhamento do pedido

Sim, dá pra fazer sem sobrecarregar o portal. O peso é mínimo: uma rota nova, uma RPC `security definer` que devolve só os campos seguros e nenhum acesso direto à tabela `orders` por anônimos. Sem novas tabelas, sem realtime, sem polling pesado.

## 1. Mudança no detalhe do pedido (`/pedido/:id`)

Na "Linha do prazo" do `OrderDetailPage.tsx` (~linhas 743–749):

- À esquerda continua **PRAZO X DIAS ÚTEIS**, e logo ao lado (mesma linha) o **prazo restante** (`8 dias úteis restantes`) — hoje fica na direcanto direito.
- No lugar onde hoje aparece o prazo restante (canto direito da linha), entram dois botões pequenos:
  - **Copiar** → copia `https://portal.7estrivos.com.br/rastreio/{id}` pra área de transferência (toast "Link copiado").
  - **Abrir** → abre o link em nova aba.
- Visível para todos os papéis logados (vendedor, admin, etc.). Cliente nunca acessa o portal — só o link público.

Sem outras mudanças de layout no detalhe.

## 2. Rota pública `/rastreio/:id`

Nova página `src/pages/PublicTrackingPage.tsx`, registrada em `App.tsx` **fora do `ChromeWrapper`** (sem Header, sem AdminAssistantFab, sem DeployNoticeBanner, sem AuthProvider exigido — `AuthProvider` continua envolvendo, mas a página não exige login).

Layout (mobile-first, mesma identidade visual do portal — fundo claro, card, fonte display nos títulos, laranja como acento):

```text
┌─────────────────────────────────────────┐
│  [logo 7Estrivos]   acompanhe a         │
│                     produção do seu     │
│                     pedido              │
├─────────────────────────────────────────┤
│  Pedido #7E-AB0123   —   Vendedor: [nome]│
│  Prazo: 7 dias úteis · 4 restantes      │
├─────────────────────────────────────────┤
│  ETAPAS DE PRODUÇÃO                     │
│  ●──●──●──○──○──○──○                   │
│  Corte · Bordado · Pesponto · ...       │
│                                         │
│  Linha do tempo:                        │
│  19/06 14:22  Pesponto 03               │
│    "obs do funcionário, se houver"      │
│  18/06 09:10  Baixa Bordado             │
│  ...                                    │
├─────────────────────────────────────────┤
│  DETALHES DA BOTA      |   [ QR CODE ]  │
│  Modelo: ...            |   (img grande) │
│  Cor cano: ...          |                │
│  Solado: ...            |                │
│  Bico: ...              |                │
│  Tamanho: ...           |                │
│  Bordado: ...           |                │
│  ...                                    │
└─────────────────────────────────────────┘
```

### O que mostra
- **Número do pedido**, produto/modelo, data de criação, prazo total + prazo restante (reusando `orderDeadline.ts` e `hasReachedFinalStage`).
- **Vendedor: [nome]** na linha do cabeçalho — mostra o nome do vendedor no lugar do modelo/bota.
- **Gráfico de progresso**: stepper horizontal das etapas-chave (Em aberto → Corte/Laser → Bordado → Pesponto → Montagem → Acabamento → Expedição → Entregue), marcando a atual com base em `status`. Usa `PRODUCTION_STATUSES` de `order-logic.ts` simplificado em grupos.
- **Linha do tempo (histórico)**: `order.historico[]` em ordem cronológica decrescente com data, hora, etapa e observação (`descricao`). Esta é a parte principal.
- **Ficha do pedido**: campos visíveis da bota (sem valores em R$, sem nome do cliente — privacidade) usando a mesma lógica de `orderFichaCategories.ts`. Para extras/cintos, mostra os campos correspondentes do `extra_detalhes`.
- **QR Code** ao lado da ficha: gerado com `qrcode` apontando para `order.fotos[0]` (mesmo QR que vai no PDF), exibido grande (~220px). Se não houver foto, omite a coluna do QR.

### O que NÃO mostra (privacidade)
Valores (preço, subtotal, ajustes, descontos), comissões, nome do cliente, histórico financeiro, comprovantes, "Conferido", solicitações de ajuste, botões de editar/excluir/mudar status.

## 3. Acesso público aos dados (Supabase)

Migração com **RPC security definer** — não abre `SELECT` na tabela `orders` para `anon`.

```sql
create or replace function public.get_public_tracking(_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare r record;
begin
  select id, numero, status, produto, tipo_extra, modelo, tamanho,
         cor_cano, cor_gaspea, cor_taloneira, cor_vira, cor_sola,
         solado, bico, bordado, cor_bordado, observacoes,
         data_criacao, hora_criacao, created_at,
         historico, fotos, extra_detalhes, cancelado, cancelamento_motivo
  into r from public.orders where id = _id;
  if not found then return null; end if;
  return to_jsonb(r);
end $$;

revoke all on function public.get_public_tracking(uuid) from public;
grant execute on function public.get_public_tracking(uuid) to anon, authenticated;
```

Frontend chama `supabase.rpc('get_public_tracking', { _id })` sem sessão. Como `id` é UUID (não enumerável), funciona como token de acesso — mesma estratégia "unguessable URL" que já se usa no QR atual.

## 4. SEO / meta
`<title>acompanhe a produção do seu pedido — 7 Estrivos</title>`, meta description curta, `robots: noindex` (links são privados por natureza).

## Impacto no portal
- 1 página nova, lazy (`React.lazy`) pra não pesar no bundle dos usuários logados.
- 1 RPC nova, leve (SELECT por PK).
- Sem novas tabelas, sem alteração de RLS existente, sem mudança em fluxos atuais.

## Arquivos
- **Novo**: `src/pages/PublicTrackingPage.tsx`
- **Novo**: migration SQL com a função `get_public_tracking`
- **Edita**: `src/App.tsx` (rota `/rastreio/:id` fora do `ChromeWrapper`)
- **Edita**: `src/pages/OrderDetailPage.tsx` (linha do prazo + botões Copiar/Abrir)
- **Edita**: `docs/BUSINESS_RULES.md` (nova seção "Rastreio público")

## Fora de escopo
- Notificações por WhatsApp/e-mail do link (pode entrar depois).
- Senha/expiração no link (pode entrar depois se quiser).
- Realtime — a página recarrega ao abrir; sem subscription.