## Objetivo

No modal de retrocesso de etapa (quando destino = Montagem / Montagem Ailton), o botão amarelo "ERRO MONTAGEM" deve aceitar o motivo digitado pelo usuário — mas continuar não obrigando o preenchimento.

Hoje: o botão ignora completamente o campo "motivo" e sempre grava a justificativa fixa "ERRO MONTAGEM".

Depois: se o campo tiver texto, esse texto vai para a justificativa/histórico; se estiver vazio, mantém o comportamento atual.

## Alterações

### 1) Migração — estender a RPC `public.montagem_marcar_erro`

Adicionar parâmetro opcional `_motivo text default null`. Se preenchido, usar como `justificativa` e anexar à `descricao` do histórico. Sem motivo, comportamento atual.

```sql
CREATE OR REPLACE FUNCTION public.montagem_marcar_erro(
  _order_id uuid,
  _destino text,
  _motivo text default null
) ...
  -- hist_entry:
  --   justificativa = COALESCE(NULLIF(trim(_motivo),''), 'ERRO MONTAGEM')
  --   descricao mantém frase padrão + ' — Motivo: <texto>' quando houver
```

Regrantar EXECUTE para `authenticated`.

### 2) UI — `src/pages/ReportsPage.tsx` (~linha 1688-1719)

- No label do textarea de motivo já existente, quando estiver visível o botão ERRO MONTAGEM, indicar que o motivo é opcional para esse botão (uma linha curta abaixo, sem mudar a validação do Confirmar principal).
- No `onClick` do botão ERRO MONTAGEM, passar `_motivo: regressionReason.trim() || null` para o RPC.
- Botão continua habilitado independentemente do tamanho do texto (só desabilita durante `bulkProgress`).

## Fora de escopo

- Confirmar principal (retrocesso normal) segue exigindo os 5 caracteres mínimos.
- Sem mudanças no PDF de cobrança, dashboard ou fluxo de baixa.