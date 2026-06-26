## Esconder status Bagy

Na `EstoquePage.tsx`, o bloco "Sincronizado com Bagy / Pendente / Erro / SKU não encontrado" + botão "Tentar novamente" só deve aparecer para:

- `admin_master`
- `admin_producao`
- `vendedor_comissao`

Esconder para `vendedor` e `bordado`.

Implementação: condicional baseada no `role` (via `useAuth`) envolvendo o bloco de status no card. Backend e sincronização não mudam.