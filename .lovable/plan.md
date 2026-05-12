## Problema

Hoje, na aba **Financeiro → A Receber**, quando o admin lança um recebimento (anexando PDF/imagem do comprovante), o sistema:
1. Extrai os dados do arquivo (data, valor, destinatário) via IA.
2. Salva os dados extraídos no banco.
3. **Descarta o arquivo** — `comprovante_url` é gravado como `null` (ver `FinanceiroAReceber.tsx:318-326` e `:458-461`).

Por isso a coluna "PDF" da tabela mostra "—" sem botão "Ver", e o admin master não consegue abrir/conferir o comprovante depois.

O bucket `financeiro` já existe (privado), o helper `uploadPdf(file, 'a-receber')` já está pronto em `financeiroHelpers.ts`, e o `ComprovanteViewer` já sabe abrir arquivos desse bucket. Só falta plugar.

## Mudanças

### 1. `proceedSave` (criação em massa) — `FinanceiroAReceber.tsx`
- Antes do `insert`, chamar `await uploadPdf(it.file, 'a-receber')` e usar o path retornado em `comprovante_url`.
- Se o upload falhar para um item, marcar como erro (sem abortar os outros).
- Manter o `comprovante_hash` como hoje (deduplicação).

### 2. `handleSaveEdit` (edição com novo anexo)
- Se `e.newFile` foi escolhido:
  - Fazer `uploadPdf` do novo arquivo.
  - Apagar o arquivo antigo via `deletePdf(editState.row.comprovante_url)` se existir.
  - Gravar o novo path em `comprovante_url` (em vez de `null`).

### 3. Sem mudanças na UI da tabela
A coluna "PDF" e o `ComprovanteViewer` (linha 746-750 e 896) já funcionam — assim que `comprovante_url` deixar de ser `null`, o botão "Ver" aparece automaticamente para o admin master.

### 4. Sem mudanças no banco
- A coluna `comprovante_url` já existe na tabela `financeiro_a_receber`.
- O bucket `financeiro` já está criado e tem políticas RLS funcionando (já é usado pelos comprovantes de revendedor).

## Fora de escopo
- Lançamentos antigos que já foram salvos com `comprovante_url = null` continuarão sem arquivo (o original não foi guardado). Só novos lançamentos a partir de agora terão o PDF/imagem visível.
- Aba "A Pagar" não foi mencionada — não vou mexer nela agora. Se quiser que aplique a mesma lógica lá, é só pedir.
