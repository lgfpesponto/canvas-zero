# Project architecture decisions

- Fiscal PDF generation lives in `src/lib/fiscal` and reads authorized NF-e records; this keeps printing separate from authorization and prevents draft data from becoming a DANFE.
- The NF-e list (`NotasFiscaisPage`) and one-off invoices (`NovaNotaFiscalForm`) reuse `transmitirNotaBagy` and `BagyNfeMenu` (via `notaId`), so a single emission and action path covers every note.
- Bulk Bagy NF-e authorization runs sequentially and retains only invalid or rejected orders in the selection; this prevents numbering conflicts and focuses correction work.
