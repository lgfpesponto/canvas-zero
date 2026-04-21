

## Seleção, totais e edição inline nos lançamentos

### O que vou adicionar

Aplicado **nas duas abas** (A Receber e A Pagar):

**1. Coluna de seleção (checkbox)**

- Checkbox no cabeçalho (selecionar/deselecionar todos os visíveis)
- Checkbox em cada linha
- Estado de seleção é **local da aba** (não persiste entre abas, não persiste após reload — comportamento esperado pra contexto financeiro)

**2. Card "Total Selecionado" sempre visível**

Adicionar **um card a mais** na grade de resumo do topo (o resumo passa de 3 cards pra 4 cards):

- A Receber: `Total recebido (filtrado)` | `Para Empresa` | `Para Fornecedor` | **`Selecionado: X itens — R$ Y`** ← novo
- A Pagar: `Em aberto` | `Pago no mês` | `Vencendo 7 dias` | **`Selecionado: X itens — R$ Y`** ← novo

O card "Selecionado" mostra:
- Se 0 selecionados: texto cinza "Nenhum selecionado" + dica "marque os itens da tabela"
- Se 1+ selecionados: contagem em destaque, valor somado em destaque, botão pequeno "Limpar seleção"

**3. Barra de ações em massa (aparece só com seleção ativa)**

Logo acima da tabela, quando `selecionados > 0`, aparece uma faixa fixa com:
- "X selecionados — Total R$ Y,YY"
- Botão **"Excluir selecionados"** (com confirmação AlertDialog: "Excluir X lançamentos? Os PDFs anexados também serão removidos.")
- Em A Pagar: botão **"Marcar selecionados como pagos"** (abre dialog único com input de data → aplica em todos)
- Botão "Limpar seleção"

**4. Lápis de edição em cada lançamento**

Botão `<Pencil size={14} />` ao lado do botão de excluir em cada linha. Ao clicar, abre um **dialog de edição** preenchido com os dados atuais:

**A Receber** edita:
- Vendedor (Select com lista de vendedores)
- Data de pagamento
- Valor
- Tipo (Empresa / Fornecedor) — RadioGroup
- Destinatário (input, desabilitado se tipo=Empresa, força "Empresa")
- Descrição (textarea)
- Comprovante: mostra link "Ver atual" + opção "Substituir arquivo" (upload novo PDF/foto). Se substituir, recalcula `comprovante_hash`, faz upload do novo, deleta o antigo do Storage e atualiza `comprovante_url`.

**A Pagar** edita:
- Fornecedor
- Número da nota
- Data de emissão
- Data de vencimento
- Valor
- Descrição
- Status (Em aberto / Pago) — se mudar pra Pago, mostra campo "Data de pagamento"
- Nota PDF: mesma lógica de substituir/manter

Validação: mesmas regras do formulário de criação (valor > 0, datas obrigatórias, etc).

Ao salvar, faz `UPDATE` no Supabase, mostra toast de sucesso, fecha o dialog, recarrega a lista. Edição **não dispara checagem de duplicidade** (é correção, não novo lançamento).

### Mudanças técnicas

**Arquivos editados:**

- `src/components/financeiro/FinanceiroAReceber.tsx`:
  - Estado `selectedIds: Set<string>` + handlers `toggle`, `toggleAll`, `clear`
  - 4º card no grid de resumo (mudar `md:grid-cols-3` → `md:grid-cols-4`, ajustar pra `md:grid-cols-2 lg:grid-cols-4` pra responsividade)
  - Coluna `<TableHead>` com checkbox master + `<TableCell>` com checkbox por linha (colSpan dos estados vazios passa de 7 pra 8)
  - Barra de ações em massa condicional acima da `<Table>`
  - Botão `<Pencil>` por linha → abre `editTarget` (estado novo)
  - Novo `<Dialog>` de edição reutilizando os mesmos campos/validação do form de criação (refatorar campos pra função helper `renderReceberFields(values, onChange)` opcional, ou inline pra simplicidade)
  - Função `handleUpdate(target, patch, newFile?)` faz upload condicional + UPDATE
  - Função `handleBulkDelete()` itera `selectedIds`, deleta PDFs + linhas

- `src/components/financeiro/FinanceiroAPagar.tsx`: mesma estrutura, adaptada aos campos da tabela `financeiro_a_pagar`. Inclui também botão massa "Marcar como pagos" reaproveitando o dialog `payTarget` em modo lote.

- `src/components/financeiro/financeiroHelpers.ts`: adicionar helper `replaceUploadedFile(oldPath, newFile, prefix)` que faz upload do novo + delete do antigo (atômico do ponto de vista do usuário; se delete falhar, mantém warning silencioso porque o registro já está atualizado).

**Componentes shadcn usados:** `Checkbox` (já existe em `ui/checkbox.tsx`), `Dialog`, `AlertDialog`, `Pencil` icon do lucide-react.

### O que NÃO mexo

- Esquema do banco (tabelas e colunas atuais bastam)
- RLS — `admin_master` já tem `update` e `delete` nas duas tabelas
- Fluxo de criação com IA, deduplicação por hash, visualizador de comprovante
- Edge Function `extract-comprovante`

### Validação (você faz depois)

1. **Seleção**: marcar 3 lançamentos em A Receber → conferir que o card "Selecionado" mostra "3 itens — R$ X" somando corretamente
2. **Master checkbox**: clicar no checkbox do cabeçalho → todos os visíveis são marcados; clicar de novo → todos desmarcam
3. **Filtro + seleção**: aplicar filtro de período "Mês atual", selecionar todos, mudar pra "Todos" → seleção persiste só para os IDs marcados (não rebombeia)
4. **Edição inline**: clicar no lápis de um lançamento → corrigir o valor de R$ 12.778,80 pra R$ 6.221,65 → salvar → conferir que a tabela atualiza
5. **Substituir comprovante**: na edição, anexar PDF novo → conferir que o "Ver" abre o novo arquivo
6. **Exclusão em massa**: selecionar 2 lançamentos → "Excluir selecionados" → confirmar → ambos somem
7. **Marcar pagos em massa (A Pagar)**: selecionar 3 notas em aberto → "Marcar como pagos" → escolher data → todas viram "Pago"

