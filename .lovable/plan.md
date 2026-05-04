## Objetivo

Reduzir drasticamente o uso de Storage do Supabase (causa provável da instabilidade), parando de salvar **PDFs/fotos de comprovantes** no bucket `financeiro`. A IA continua lendo o arquivo no envio, extrai os dados (valor, data, pagador, documento, tipo) e salva **apenas os dados estruturados + hash** no banco. O arquivo em si é descartado após a leitura.

Tudo o que **não** é comprovante (pedidos, baixas, saldo, movimentos, histórico, alterações, fotos de pedidos, notas fiscais a pagar) **continua salvando normalmente** — nenhuma mudança de comportamento ali.

## Escopo da mudança

Três fluxos hoje fazem upload no bucket `financeiro`:

1. **`EnviarComprovanteDialog.tsx`** (revendedor envia comprovante de pagamento) — vai parar de subir o arquivo.
2. **`FinanceiroAReceber.tsx`** (admin registra recebimento com comprovante) — vai parar de subir o arquivo.
3. **`FinanceiroAPagar.tsx`** (admin anexa comprovante de pagamento de nota) — vai parar de subir o arquivo.

A nota fiscal (`nota_url`) em `financeiro_a_pagar` **continua sendo salva** no Storage, porque é documento fiscal que precisa ser auditável. Só os **comprovantes de pagamento** deixam de ser armazenados.

## O que muda no comportamento

**Antes:** usuário envia arquivo → IA lê → arquivo vai pro Storage → linha no banco aponta pro arquivo via `comprovante_url` → admin pode reabrir e ver o PDF.

**Depois:** usuário envia arquivo → IA lê → arquivo é descartado → linha no banco salva só os dados extraídos (valor, data, pagador, hash para deduplicação) → **botão "Ver comprovante" some** das telas (substituído por um indicador "Comprovante não armazenado — dados extraídos por IA").

A coluna `comprovante_url` continua existindo no banco para os registros antigos (mantém histórico), mas novos registros entram com `comprovante_url = null`.

## Arquivos a alterar

```text
src/components/financeiro/saldo/EnviarComprovanteDialog.tsx
  └ remove uploadPdf(), envia insert com comprovante_url=null
src/components/financeiro/FinanceiroAReceber.tsx
  └ remove uploadPdf no fluxo de criar/editar/replace; UI esconde botão "Ver" quando url é null
src/components/financeiro/FinanceiroAPagar.tsx
  └ remove upload do comprovante de pagamento (mantém nota_url da NF)
src/components/financeiro/saldo/ComprovantesPorRevendedor.tsx
  └ esconde botão "Ver" quando comprovante_url é null
src/components/financeiro/saldo/ComprovantesRevendedorPendentes.tsx
  └ esconde botão "Ver" quando comprovante_url é null
```

A IA de extração e a deduplicação por `comprovante_hash` continuam funcionando — o hash é calculado em memória antes do arquivo ser descartado.

## O que NÃO muda

- Pedidos (`orders`), histórico, alterações, fotos de pedidos, conferência, baixas automáticas em saldo, movimentos de saldo, notificações, templates — tudo intacto.
- Notas fiscais (`nota_url` em `financeiro_a_pagar`) continuam salvas.
- Dados de comprovantes antigos já no Storage permanecem acessíveis (não vamos deletar nada retroativamente).
- RLS, roles, deduplicação, fluxo de aprovação — todos preservados.

## Aviso

O admin **perde a capacidade de reabrir o PDF/foto** dos novos comprovantes para auditoria visual. A confiança passa a ser nos dados extraídos pela IA + hash de deduplicação. Se quiser preservar auditoria visual, o caminho alternativo é manter o upload e investigar o problema do Supabase por outro lado.

Confirmando que pode prosseguir, eu implemento as mudanças nos 5 arquivos acima.