## Objetivo

Criar nova etapa de produção **"Montagem Ailton"** que recebe **apenas** pedidos vindos de **"Pesponto Ailton"** e, a partir dela, segue os mesmos destinos atuais de "Montagem" (Revisão, Expedição, Baixa Site, Baixa Estoque). Adicionalmente:
- **"Pesponto Ailton"** passa a avançar **somente** para "Montagem Ailton".
- **"Montagem"** passa a receber **somente** de "Pespontando" (Pesponto Ailton deixa de mandar para Montagem).

## Comportamento para pedidos existentes

Não há reclassificação retroativa. Pedidos que hoje estão em "Pesponto Ailton" ou "Montagem" permanecem onde estão; as novas restrições passam a valer apenas na **próxima** mudança de etapa.

## Mudanças

### 1. Banco — nova etapa em `status_etapas`

Inserir `'Montagem Ailton'` (slug `montagem-ailton`) logo após `Montagem` (ordem 18). Como existem etapas com ordem ≥ 19 (Revisão, Expedição, etc.), incrementar todas em +1 antes do INSERT para manter a sequência limpa.

### 2. `src/lib/statusTransitions.ts` (FLOW de bota)

- `'Pesponto Ailton'`: passa de `['Montagem']` para `['Montagem Ailton']`.
- Adicionar `'Montagem Ailton': ['Revisão', 'Expedição', 'Baixa Site (Despachado)', 'Baixa Estoque']`.
- `'Montagem'` mantém destinos atuais. O único feeder direto passa a ser `'Pespontando'` (já é hoje).

`BELT_FLOW` (cinto) não tem etapa "Montagem"/"Montagem Ailton" e fica inalterado.

`EXTRAS_FLOW` não é afetado.

### 3. `src/lib/order-logic.ts`

Adicionar `'Montagem Ailton'` logo depois de `'Montagem'` nas listas:
- `PRODUCTION_STATUSES` (linha 48)
- `PRODUCTION_STATUSES_USER` (linha 62)
- `PRODUCTION_STATUSES_IN_PROD` (linha 97)

`BELT_STATUSES` não inclui "Montagem", então também não recebe "Montagem Ailton".

### 4. `docs/BUSINESS_RULES.md`

Refletir no fluxo de produção:
- Pesponto Ailton → Montagem Ailton (única saída).
- Montagem Ailton → Revisão / Expedição / Baixa Site / Baixa Estoque.
- Montagem recebe apenas de Pespontando.

## Observações técnicas

- `getAllowedNextStatuses` hoje devolve todas as chaves do fluxo (transições laterais/retrocessos seguem com justificativa). A restrição "Pesponto Ailton só vai para Montagem Ailton" se aplica ao **avanço direto recomendado**; retrocessos/laterais com justificativa continuam funcionando como nas demais etapas — consistente com o padrão Sandro/Giovane.
- Nenhum UPDATE em dados existentes: pedidos atuais em Pesponto Ailton/Montagem ficam onde estão e seguem o novo mapa só na próxima transição.
- Relatórios (`SpecializedReports.tsx`, `pdfGenerators.ts`) não exigem mudança: "Montagem Ailton" não é etapa de bordado/corte/forro/solado e não aparece em nenhuma lista especializada — entra automaticamente nas listagens gerais via `PRODUCTION_STATUSES`.
