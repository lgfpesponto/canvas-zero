
## Objetivo

Resolver o problema "não saber o valor real do PDF do dia 03/05" sem encher o storage:

1. **PDFs de Cobrança**: arquivo PDF salvo + snapshot leve (sempre).
2. **Outros PDFs** (cortes, bordados, expedição, etc.): só snapshot leve (sem o arquivo).
3. **Retenção 90 dias** (pruner automático).
4. **Acesso restrito** ao admin_master.
5. **UI** integrada na aba `/admin/configuracoes` → tela Gestão.

---

## Reorganização da página Gestão

Hoje a página tem 2 banners e 2 abas. A nova estrutura, conforme pediu:

```
[ Banner deploy/aviso ]               ← topo, fixo
[ Aba: Ao vivo | Auditoria | Histórico de PDFs ]
```

- **Ao vivo**: o atual "Usuários online" (renomeado).
- **Auditoria**: encolhida em formato `<Collapsible>` (já existe, só ganha um wrapper que começa fechado, com botão "Mostrar/Ocultar auditoria").
- **Histórico de PDFs** (nova aba): vide abaixo.

Também removo o `<DeployAnnouncementCard />` duplicado dentro do `TabsContent value="online"` (hoje aparece 2x).

---

## Banco de dados

### Tabela `pdf_snapshots` (snapshot leve para QUALQUER PDF gerado)

```
id              uuid PK
tipo            text       -- 'cobranca', 'corte', 'bordados', 'expedicao', 'forro', 'palmilha', 'comissao', etc.
gerado_em       timestamptz default now()
gerado_por      uuid       -- auth.uid()
gerado_por_nome text       -- snapshot do nome
filtros         jsonb      -- { vendedor, status, data_de, data_ate, produtos, ... }
order_ids       uuid[]     -- ids dos pedidos que entraram no PDF
totais          jsonb      -- { qtd_pedidos, qtd_produtos, valor_total, ... }
storage_path    text NULL  -- caminho no bucket (só preenchido p/ Cobrança)
arquivo_kb      int  NULL  -- tamanho do arquivo (só Cobrança)
```

RLS: SELECT/INSERT/DELETE apenas `admin_master` (INSERT também permite admins via trigger se preferir). Cliente insere via `supabase.from('pdf_snapshots').insert(...)` chamado pelo admin que clicou em "Gerar PDF".

### Storage

Reutiliza o bucket `financeiro` (já existe, privado), em pasta `pdf-historico/cobranca/{yyyy-mm-dd}/{snapshot_id}.pdf`. Políticas: leitura/insert/delete só para `admin_master`.

### Pruner (90 dias)

Edge function `pdf-historico-prune` rodando via cron diário:
- `DELETE FROM pdf_snapshots WHERE gerado_em < now() - interval '90 days' RETURNING storage_path` → para cada path não nulo, remove o arquivo do Storage.

---

## Geração: o que muda no código

### `SpecializedReports.tsx`

Após cada `doc.save(...)` adicionar uma chamada `await registrarPdfSnapshot({ tipo, filtros, orderIds, totais, doc? })`.

Helper novo `src/lib/pdfHistorico.ts`:

```ts
export async function registrarPdfSnapshot(args: {
  tipo: string;
  filtros: Record<string, unknown>;
  orderIds: string[];
  totais: Record<string, number>;
  doc?: jsPDF; // se vier, faz upload no Storage (Cobrança)
}) { ... }
```

- Para `tipo === 'cobranca'`: `doc.output('blob')` → upload no bucket → grava `storage_path` + `arquivo_kb`.
- Para os demais tipos: só insere a linha (snapshot leve, ~5-20 KB no banco).

Falha silenciosa (try/catch + console.warn) — nunca quebra o "Gerar PDF" do usuário.

### Onde plugar inicialmente (12 PDFs do `SpecializedReports.tsx`)

Todos os `generateXxxPDF()` ganham 1 linha antes do `doc.save`. O ID dos pedidos vem de `filtered`/equivalente já presente em cada função.

---

## Nova aba "Histórico de PDFs"

Componente: `src/components/gestao/HistoricoPdfTab.tsx`.

**UI**:

- Filtros topo: período (default últimos 30 dias), tipo (multi-select), vendedor (texto), busca.
- Tabela:

```
Data/Hora | Tipo | Vendedor (filtro) | Status (filtro) | Qtd pedidos | Valor total | Gerado por | Ações
```

- Para linhas com `storage_path`:
  - botão **Baixar PDF** (signed URL 60 s).
- Para todas as linhas:
  - botão **Ver snapshot** → modal com a lista dos pedidos (numero, cliente, vendedor, status, valor) — usa `order_ids` + um `select` em `orders` no momento da abertura. Permite copiar a lista, ver "naquele momento" vs "hoje" (diff de status / valor) e exportar CSV.
- Aviso no topo: "Histórico mantido por 90 dias. Apenas PDFs de Cobrança guardam o arquivo; os demais guardam só o resumo."

Paginação: 50 por página.

---

## Auditoria recolhida

Envolver o `<AuditoriaTab />` em um `<Collapsible defaultOpen={false}>` com header "Auditoria de alterações" + chevron. Sem mexer no conteúdo dela.

---

## Detalhes técnicos

- **Sem migração para `auth.users`**; só `pdf_snapshots` e políticas no Storage.
- Bucket reaproveitado (`financeiro`) → não cria bucket novo.
- Ratelimit / dedupe: opcional; se mesmo admin clicar "Gerar PDF" 2x em < 30s com mesmos filtros, deduplico no helper (UPDATE em vez de INSERT) para não inflar histórico — configurável.
- Edge function pruner: 1 cron diário (`0 4 * * *` Brasília via UTC). Pode ser disparado manualmente por botão "Limpar agora" no header da aba (admin_master).
- Estimativa de storage: 10 PDFs Cobrança/dia × ~300 KB × 90 dias ≈ **270 MB** estáveis. Snapshots leves: ~50 PDFs/dia × 5 KB × 90 dias ≈ **22 MB** no banco.

---

## Entregáveis (ordem de implementação)

1. Migração SQL: tabela `pdf_snapshots` + RLS + policies de Storage para `financeiro/pdf-historico/*`.
2. `src/lib/pdfHistorico.ts` (helper).
3. Plug nos 12 geradores de `SpecializedReports.tsx` (sempre snapshot; upload só p/ cobrança).
4. `src/components/gestao/HistoricoPdfTab.tsx` + modal de detalhes.
5. Reorganização do `GestaoPage.tsx` (3 abas + Auditoria collapsible + remover banner duplicado).
6. Edge function `pdf-historico-prune` + cron + botão manual.
7. Memória: novo arquivo `mem://features/admin/pdf-historico` + entrada no índice.

---

## Como isto resolve o caso do dia 03/05

Quando você quiser saber "quanto valia a Cobrança da Stefany no dia 03/05":
- abre **Gestão → Histórico de PDFs**, filtra Tipo = Cobrança, Vendedor = Stefany, dia 03/05.
- vê o PDF original (download) **e** o snapshot — com a lista exata de IDs de pedido daquele momento.
- abre o modal e compara automaticamente: pedidos que mudaram de status, pedidos que sumiram, diferença de valor → resposta auditável em 30 segundos.
