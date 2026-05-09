## Problema

Hoje quando o vendedor envia um comprovante, a IA lê os dados (valor, data, destinatário) mas **o arquivo em si não é mais salvo** no Storage. A coluna `comprovante_url` fica `null` e na tela "Comprovantes a entrar (vendedores)" do admin master aparece "só dados" no lugar do botão de visualizar — ou seja, a Juliana não consegue conferir o PDF/foto antes de aprovar.

## Solução

Voltar a fazer upload do arquivo no bucket `financeiro` (pasta `revendedor-saldo/`) durante o envio, salvando o caminho em `comprovante_url`. A tela de pendentes já tem o botão e o `ComprovanteViewer` prontos — basta o `comprovante_url` deixar de ser `null`.

## Mudanças

### `src/components/financeiro/saldo/EnviarComprovanteDialog.tsx`

1. Importar `uploadComprovanteRevendedor` de `@/lib/revendedorSaldo` (já existe e usa o bucket correto).
2. No loop de `handleSendAll`, antes do `insert` na tabela `revendedor_comprovantes`:
   - Fazer `const path = await uploadComprovanteRevendedor(it.file);`
   - Trocar `comprovante_url: null` por `comprovante_url: path`.
   - Se o upload falhar, marcar o item como erro e seguir (sem inserir registro órfão).
3. Manter todo o resto (deduplicação por hash, extração IA, validações) intacto.

### Nada mais muda

- A tela do vendedor (`RevendedorSaldoPage`) continua sem coluna "Anexo" — o arquivo fica disponível só para o admin master.
- `ComprovantesRevendedorPendentes.tsx` já abre o `ComprovanteViewer` quando `comprovante_url` existe; nenhuma alteração necessária.
- RLS do bucket `financeiro` e da tabela já permitem o fluxo (vendedor faz upload em modo autenticado, admin master gera signed URL).
- Comprovantes antigos (já enviados sem arquivo) continuam mostrando "só dados" — não há como recuperá-los.

## Observação

Isso vai consumir Storage de novo (havia sido removido para economizar). Os arquivos ficam no bucket `financeiro` indefinidamente; se quiser, depois posso adicionar um pruner para apagar PDFs de comprovantes já aprovados há mais de N dias.
