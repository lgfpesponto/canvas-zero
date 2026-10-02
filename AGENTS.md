# Project architecture decisions

- Fiscal PDF generation lives in `src/lib/fiscal` and reads authorized NF-e records; this keeps printing separate from authorization and prevents draft data from becoming a DANFE.
- The NF-e list (`NotasFiscaisPage`) and one-off invoices (`NovaNotaFiscalForm`) reuse `transmitirNotaBagy` and `BagyNfeMenu` (via `notaId`), so a single emission and action path covers every note.
- Bulk Bagy NF-e authorization runs sequentially and retains only invalid or rejected orders in the selection; this prevents numbering conflicts and focuses correction work.
- A Bagy order may have only one active normal NF-e (processing or authorized); complementary and return notes remain separate, preventing duplicate fiscal authorization.
- Shipping labels go through edge function `envio-etiqueta` (Correios contract CWS / Melhor Envio / showroom pickup) and are stored in the private `etiquetas-envio` bucket; credentials never reach the browser.

- A Bagy NF-e return (devolução) marks the original normal note as `devolvida`, which frees a new normal note for the exchange order (TROCA+number); the history stays intact and only one active note exists.
- The Bagy order list loads without `payload` and links portal orders with one candidate query, matching numbers in memory; this avoids slow ILIKE scans.
- The pricing calculator (`/calculadora`) embeds `OrderPage`/`BeltOrderPage` with `calcMode`, receiving price and selections through `CalcEmitter`; this reuses the real production form instead of duplicating price rules.
