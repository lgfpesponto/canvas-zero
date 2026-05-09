Remover a coluna **Anexo** da tabela "Meus comprovantes enviados" em `src/pages/RevendedorSaldoPage.tsx`:

- Remover `<TableHead className="text-right">Anexo</TableHead>` do cabeçalho.
- Remover o `<TableCell>` correspondente (botão `FileText` que abre o `ComprovanteViewer`) de cada linha.
- Remover `viewerPath` state, `setViewerPath`, o componente `<ComprovanteViewer />` e os imports não usados (`FileText`, `ComprovanteViewer`).

Vendedor continua vendo data, valor, status e observação/motivo — só não consegue mais reabrir o anexo enviado. Admin master continua com acesso total ao anexo pela aba Financeiro.