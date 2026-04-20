

## Alerta de duplicidade com confirmação obrigatória

### Regra nova

Sempre que o sistema detectar que um comprovante pode ser duplicado, **parar o salvamento** e exibir um diálogo de confirmação. Só prossegue se o usuário clicar "Sim, salvar mesmo assim".

### O que conta como "duplicidade"

Um comprovante é considerado possível duplicata se **já existe no banco** (na mesma aba — A Receber ou A Pagar) um registro com:

- **Mesmo valor** (R$ exato), **E**
- **Mesma data de pagamento**, **E**
- **Mesmo destinatário** (case-insensitive, trim)

Essa tripla é forte o suficiente pra apontar duplicata real sem dar falso positivo (duas transferências do mesmo dia pro mesmo destino com valor idêntico ao centavo é raríssimo).

Adicionalmente, se o **hash do arquivo** (SHA-256 do PDF/foto) já existir em qualquer registro do banco, é duplicata **certa** (mesmo arquivo já foi enviado antes) — nesse caso o aviso é mais forte.

### Fluxo de UX

Quando o usuário clica **"Salvar X recebimento(s)"** (ou "Salvar X pagamento(s)"):

1. Antes de inserir cada item, consulta o banco procurando registros com a mesma tripla `valor + data + destinatário` **ou** mesmo `comprovante_hash`
2. Se nenhum item é duplicado → salva tudo normalmente (comportamento atual)
3. Se 1+ itens são suspeitos de duplicata → abre `AlertDialog` listando cada um:

```text
⚠️ Possível duplicidade detectada

• Comprovante-2AA3...pdf
  R$ 6.221,65 — 15/04/2026 — Débora Cristina
  Já existe registro idêntico salvo em 15/04/2026.

• Recibo-Stone.pdf
  Mesmo arquivo já foi enviado anteriormente (hash idêntico).

Deseja salvar mesmo assim?

[Cancelar]  [Sim, salvar todos]  [Salvar só os não duplicados]
```

4. **Cancelar** → volta pro modal sem salvar nada
5. **Sim, salvar todos** → salva inclusive os duplicados (caso seja transferência legítima repetida)
6. **Salvar só os não duplicados** → salva apenas os que passaram na verificação, mantém os suspeitos no card pra o usuário revisar

### Mudanças técnicas

**1. Banco** — adicionar coluna `comprovante_hash text` em `financeiro_a_receber` e `financeiro_a_pagar` (nullable, índice btree). Backfill opcional fica em null pros registros antigos.

**2. Salvar o hash** ao inserir — `FinanceiroAReceber.tsx` e `FinanceiroAPagar.tsx` já calculam `fileHash` no momento do upload; só passar pro insert.

**3. Função de checagem** em `financeiroHelpers.ts`:

```ts
checkDuplicates(table, items): Promise<DuplicateInfo[]>
// retorna lista com { itemId, reason: 'hash' | 'triple', existingId, existingDate }
```

Faz UMA query OR com `.or()` cobrindo todos os candidatos de uma vez (evita N requisições).

**4. Novo componente** `DuplicateConfirmDialog.tsx` reutilizável entre A Receber e A Pagar — recebe lista de duplicatas e callbacks (cancelar / salvar todos / salvar só não duplicados).

**5. Integrar no `handleSaveAll`** das duas abas: rodar `checkDuplicates` antes do loop de insert; se vier não-vazio, abrir o dialog e aguardar a decisão antes de continuar.

### Arquivos

- **Migração SQL**: adicionar coluna `comprovante_hash` em duas tabelas + índice
- `src/components/financeiro/financeiroHelpers.ts` — função `checkDuplicates`
- `src/components/financeiro/DuplicateConfirmDialog.tsx` — novo
- `src/components/financeiro/FinanceiroAReceber.tsx` — usar checagem + dialog, salvar hash
- `src/components/financeiro/FinanceiroAPagar.tsx` — mesmo

### O que NÃO mexo

- Edge Function de extração (separado, próximo passo se quiser)
- Visualizador de comprovante
- Lógica de upload pro Storage
- RLS

### Validação (você faz depois)

1. Tentar registrar de novo o mesmo PDF Stone (R$ 6.221,65 — 15/04 — Débora) → deve abrir alerta de duplicata por hash + tripla
2. Cancelar → nada é salvo
3. Tentar de novo e clicar "Salvar só os não duplicados" → nada salva (era só um, era duplicado)
4. Registrar comprovante completamente novo → salva direto sem alerta
5. Misturar 1 novo + 1 duplicado → alerta lista só o duplicado, opção "salvar só os não duplicados" salva 1

