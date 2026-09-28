# Project architecture decisions

- Fiscal PDF generation lives in `src/lib/fiscal` and reads authorized NF-e records; this keeps printing separate from authorization and prevents draft data from becoming a DANFE.