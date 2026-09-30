# Project architecture decisions

- Fiscal PDF generation lives in `src/lib/fiscal` and reads authorized NF-e records; this keeps printing separate from authorization and prevents draft data from becoming a DANFE.- The NF-e list (`NotasFiscaisPage`) and one-off invoices (`NovaNotaFiscalForm`) reuse `transmitirNotaBagy` and `BagyNfeMenu` (via `notaId`), so a single emission and action path covers every note.
