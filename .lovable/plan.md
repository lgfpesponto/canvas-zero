
## Objetivo

Replicar o fluxo de upload da Juliana (extração automática via IA) para os revendedores autorizados, e fazer com que **a aprovação do comprovante do revendedor**:

1. Crie um lançamento real em **Financeiro › A Receber** (com tipo Empresa/Fornecedor decidido pelo CNPJ extraído).
2. Credite o saldo do revendedor (já funciona).
3. Dispare a baixa automática FIFO dos pedidos cobrados (já funciona).

E mostrar para o admin 7estrivos um **card destacado no dashboard** com a contagem e valor total de comprovantes a entrar, com link "Aprovar agora" indo direto pra aba Saldo.

Nada do fluxo já existente da Juliana é alterado — só estendido.

---

## 1. Tela do revendedor (`RevendedorSaldoPage` + `EnviarComprovanteDialog`)

**Substituir** o dialog atual de envio (que pede valor + data + observação manualmente) por um fluxo **idêntico ao da Juliana em A Receber**:

- Campo de upload **multi-arquivo** (PDF + imagens), drag-and-drop.
- Para cada arquivo:
  - Chama `extract-comprovante` (edge function que já existe).
  - Mostra card com status: `processing → ready → saving → saved` (ou `error` com botão "tentar novamente").
  - Quando `ready`, exibe valor + data **somente leitura** (revendedor não edita — vai ser conferido pela admin).
  - Campo opcional "Observação" (livre).
  - Botão X pra remover do lote.
- Botão "Enviar N comprovante(s)" no rodapé:
  - Faz upload dos arquivos pra `financeiro/revendedor-saldo/`.
  - Insere N linhas em `revendedor_comprovantes` com `status='pendente'`, valor + data extraídos pela IA, observação digitada.
  - Mantém checagem de duplicata por hash (já existe).

Vendedor é fixo (`vendedorName` do hook de acesso) — revendedor nunca escolhe.

## 2. Painel do admin — aba Financeiro › A Receber

**Adicionar uma nova seção no topo da aba "A Receber"** chamada **"Comprovantes a entrar (revendedores)"**:

- Lista todos os `revendedor_comprovantes` com `status='pendente'`.
- Cada linha mostra:
  - Revendedor (quem mandou)
  - Data do pagamento (extraída IA)
  - Valor (extraído IA)
  - **Pagador detectado** (nome + CNPJ que a IA extraiu — preview do que será o destinatário).
  - **Tipo sugerido**: badge "Empresa" se o CNPJ bater com `02139487000113` (Leandro Garcia Feliciano), senão "Fornecedor".
  - Observação do revendedor.
  - Botão "Ver anexo" (PDF/imagem viewer já existe).
  - Botão **"Confirmar entrada"** (verde) e **"Reprovar"** (vermelho).

**O que muda no banco** quando admin clica em "Confirmar entrada":

- Estender a função RPC `aprovar_comprovante_revendedor(_comprovante_id)` para também:
  1. Inserir uma linha em `financeiro_a_receber` com:
     - `vendedor` = nome do revendedor que mandou
     - `data_pagamento` = data do comprovante
     - `valor` = valor do comprovante
     - `tipo` = 'empresa' se CNPJ pagador = `02139487000113`, senão 'fornecedor'
     - `destinatario` = 'Empresa' se tipo=empresa, senão nome do pagador extraído
     - `descricao` = "Comprovante de revendedor — [observação]"
     - `comprovante_url` = mesma URL do anexo (reutiliza o arquivo já no storage)
     - `comprovante_hash` = mesmo hash
  2. Continuar fazendo o que já faz: inserir movimento `entrada_comprovante`, atualizar saldo, rodar `tentar_baixa_automatica`.

Para isso preciso adicionar duas colunas em `revendedor_comprovantes`:
- `pagador_nome text` — nome extraído pela IA (preenchido no envio)
- `pagador_documento text` — CNPJ/CPF extraído pela IA (normalizado, só dígitos)
- `tipo_detectado text` — 'empresa' | 'fornecedor' calculado no envio

Esses campos são populados **no momento do envio** (front roda `extract-comprovante` antes do insert e armazena o resultado), pra a função RPC só consultar.

**Reprovação** continua igual ao que já existe (motivo obrigatório, não cria nada em A Receber).

## 3. Dashboard 7estrivos (`AdminDashboard`)

- Adicionar **card destacado** no topo do dashboard (só pra `admin_master`), borda destrutiva quando `count > 0`:
  - Título: "Comprovantes a entrar"
  - Contagem (N comprovantes)
  - Valor total somado
  - Botão "Aprovar agora" → navega pra `/financeiro` aba `receber` (URL: `/financeiro?tab=receber#comprovantes-revendedor`).
- Faz uma RPC simples ou query direta em `revendedor_comprovantes` filtrando `status='pendente'` (RLS já permite admin ver tudo).

## 4. Arquivos a alterar/criar

**Migração SQL**:
- `ALTER TABLE revendedor_comprovantes ADD COLUMN pagador_nome text, pagador_documento text, tipo_detectado text`.
- Recriar função `aprovar_comprovante_revendedor` para também inserir em `financeiro_a_receber` com mapeamento Empresa/Fornecedor pelo CNPJ.

**Edição de código**:
- `src/components/financeiro/saldo/EnviarComprovanteDialog.tsx` → reescrever pra usar fluxo multi-arquivo + IA (espelhando lógica de `FinanceiroAReceber`).
- `src/lib/revendedorSaldo.ts` → adicionar campos `pagador_nome`, `pagador_documento`, `tipo_detectado` no tipo `RevendedorComprovante`.
- `src/components/financeiro/FinanceiroAReceber.tsx` → adicionar bloco "Comprovantes a entrar (revendedores)" no topo, antes da tabela atual. Reutiliza `ComprovanteViewer` e RPCs já existentes.
- `src/components/financeiro/saldo/FinanceiroSaldoRevendedor.tsx` → manter como está (continua mostrando a fila de aprovação na aba "Saldo do revendedor"; a aprovação a partir dali continua funcionando porque a RPC vai estender o comportamento).
- `src/components/dashboard/AdminDashboard.tsx` → adicionar card "Comprovantes a entrar" no topo com link.
- `src/pages/FinanceiroPage.tsx` → ler `?tab=` da URL pra abrir a aba certa quando vier do dashboard.

## 5. Sem regressão

- Fluxo da Juliana em A Receber permanece **intacto** — ela continua podendo lançar manualmente recebimentos como hoje.
- Fluxo do saldo do revendedor (FIFO, baixa integral, auditoria) **mantido** — só passa a também espelhar em A Receber quando for aprovado via revendedor.
- Comprovantes lançados manualmente pela Juliana (no fluxo dela) **não** entram na fila do revendedor.
- Os comprovantes pendentes ficam visíveis em **dois lugares** pro admin: na aba "A Receber" (novo bloco) e na aba "Saldo do revendedor" (já existe). A aprovação pode ser feita em qualquer um dos dois — efeito é o mesmo.

## 6. Pontos a confirmar antes de executar

- ✅ Revendedor **só anexa** + observação opcional. Valor/data extraídos pela IA, não editáveis pelo revendedor (admin valida).
- ✅ Tipo Empresa = CNPJ `02139487000113` (Leandro Garcia Feliciano). Qualquer outro CNPJ/CPF = Fornecedor com nome do pagador detectado.
- ✅ Card no topo do dashboard 7estrivos com contagem + valor + botão "Aprovar agora" → leva pra aba A Receber.
- ✅ Aprovação cria automaticamente o registro em A Receber + credita saldo + dispara baixa FIFO.
