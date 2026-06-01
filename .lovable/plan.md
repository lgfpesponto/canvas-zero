## Ajuste: restringir transições do "Bordado Giovane"

Diferente do **Bordado Sandro**, o **Bordado Giovane** terá fluxo mais restrito:

- **Entrada**: somente a partir de **Baixa Corte**.
- **Saída**: apenas **Pesponto 01, 02, 03, 04, 05** e **Pesponto Ailton** (sem `Pespontando`, sem `Estampa`).

### Mudanças em `src/lib/statusTransitions.ts`

1. Criar uma constante local com os destinos do Giovane:
   ```ts
   const GIOVANE_NEXT = [
     'Pesponto 01', 'Pesponto 02', 'Pesponto 03',
     'Pesponto 04', 'Pesponto 05', 'Pesponto Ailton',
   ];
   ```
2. `BAIXA_CORTE_NEXT` continua incluindo `'Bordado Giovane'` (já é o único ponto de entrada).
3. `FLOW['Estampa']` **NÃO** receberá `'Bordado Giovane'` (apenas Sandro continua).
4. `FLOW['Bordado Giovane'] = GIOVANE_NEXT` (em vez de `PESPONTOS`).
5. `BELT_FLOW['Estampa']` idem — sem Giovane.
6. `BELT_FLOW['Bordado Giovane'] = GIOVANE_NEXT`.

### O que NÃO muda

- Migration do banco (`status_etapas`) permanece igual (inserir 'Bordado Giovane' ordem 9).
- Listas em `src/lib/order-logic.ts` (`PRODUCTION_STATUSES`, `PRODUCTION_STATUSES_USER`, `BELT_STATUSES`, `PRODUCTION_STATUSES_IN_PROD`) continuam incluindo `'Bordado Giovane'`.
- `BORDADO_STATUSES` em `SpecializedReports.tsx` e a lista em `pdfGenerators.ts` permanecem com Giovane.
- `docs/BUSINESS_RULES.md` atualizado refletindo as transições restritas.

### Resultado

- Em **Baixa Corte**, o usuário vê **Bordado Giovane** como opção (junto com Sandro, 7Estrivos, Laser, etc.).
- Em **Estampa**, apenas Sandro/7Estrivos/Pespontos seguem aparecendo (Giovane fica oculto).
- Estando em **Bordado Giovane**, só é possível avançar para os 6 pespontos enumerados — `Pespontando` fica fora.
- `Aguardando` e `Cancelado` continuam sempre disponíveis (regra global).