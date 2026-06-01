## Adicionar etapa "Bordado Giovane"

Espelhar exatamente o comportamento de **Bordado Sandro**, criando uma nova etapa paralela.

### 1. Banco de dados (migration)
Inserir em `status_etapas`:
- `nome = 'Bordado Giovane'`, `slug = 'bordado-giovane'`, `ordem = 9` (logo após Sandro = 8)
- Reordenar (`ordem + 1`) as etapas atuais com `ordem >= 9` para não duplicar índice.

### 2. `src/lib/statusTransitions.ts`
Em todos os pontos onde aparece `'Bordado Sandro'`, adicionar `'Bordado Giovane'` ao lado:
- `BAIXA_CORTE_NEXT` (linha 17-20) → adicionar como destino válido a partir de Baixa Corte.
- `FLOW['Estampa']` (linha 33) → adicionar como destino válido a partir de Estampa.
- `FLOW['Bordado Giovane'] = PESPONTOS` (espelha linha 35).
- `BELT_FLOW['Estampa']` (linha 102) → idem.
- `BELT_FLOW['Bordado Giovane'] = PESPONTOS` (espelha linha 104).

### 3. `src/lib/order-logic.ts`
Adicionar `"Bordado Giovane"` ao lado de `"Bordado Sandro"` nas quatro listas:
- `PRODUCTION_STATUSES` (linha 46)
- `PRODUCTION_STATUSES_USER` (linha 60)
- `BELT_STATUSES` (linha 76)
- `PRODUCTION_STATUSES_IN_PROD` (linha 95)

### 4. `src/components/SpecializedReports.tsx`
Linha 73: adicionar `'Bordado Giovane'` em `BORDADO_STATUSES` para o relatório de bordado contemplá-la.

### 5. `src/lib/pdfGenerators.ts`
Linha 717: incluir `'Bordado Giovane'` na lista de status de bordado usada na geração do PDF.

### 6. `docs/BUSINESS_RULES.md`
Atualizar o fluxo (linha 362) inserindo `Bordado Giovane` após `Bordado Sandro`.

### Resultado
- Mesmas transições de entrada (vinda de **Baixa Corte** ou **Estampa**) que o Sandro.
- Mesmas transições de saída (qualquer **Pesponto**/`Pespontando`).
- Aparece em listagens de status, filtros de produção, relatório de bordado e PDFs exatamente como Sandro.
- Roles que hoje podem mover para Sandro (admin_master, admin_producao) automaticamente também podem mover para Giovane — não há regra de role específica por etapa de bordado.

Nada relacionado a `bordado` role (Neto/Débora) muda — essa role só atua nas etapas `Entrada/Baixa Bordado 7Estrivos`, conforme RLS atuais.