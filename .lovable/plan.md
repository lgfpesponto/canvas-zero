# Adicionar etapas Pesponto 06 a Pesponto 10

Novas etapas de produção espelhando exatamente o comportamento de "Pesponto 01" (mesmas origens e mesmo destino → "Pespontando").

## Mudanças

### 1. `src/lib/statusTransitions.ts`
- Adicionar `'Pesponto 06'`, `'Pesponto 07'`, `'Pesponto 08'`, `'Pesponto 09'`, `'Pesponto 10'` ao array `PESPONTOS` (assim já viram destino válido a partir de Baixa Corte/Laser/Bordado/Sem bordado/Estampa, tanto em `FLOW` quanto em `BELT_FLOW`).
- Adicionar as 5 entradas no `FLOW` e no `BELT_FLOW` apontando para `['Pespontando']` (igual Pesponto 01–05).
- Adicionar as 5 etapas a `GIOVANE_NEXT` para manter paridade com Pesponto 01–05 vindos de Bordado Giovane.

### 2. `src/lib/order-logic.ts`
- Incluir `Pesponto 06–10` em `PRODUCTION_STATUSES` e `PRODUCTION_STATUSES_USER` (na mesma posição lógica, logo após Pesponto 05 e antes de Pesponto Ailton), para que apareçam nos seletores de status e filtros de relatório.

### 3. `docs/BUSINESS_RULES.md`
- Atualizar a seção R (Fluxos de Status — Botas) listando Pesponto 01 a 10.

## Verificação
- Buscar usos hardcoded de `'Pesponto 05'` / `Pesponto 0` no resto do código (relatórios, PDFs, dashboards de produção) para garantir que ninguém itera lista fixa que precise ser estendida. Caso encontre, adicionar os novos itens.

## Fora de escopo
- Nenhuma mudança de banco: status é texto livre na coluna `status`, basta as constantes do front reconhecerem.
- Sem mudança em comissão, preços ou permissões.
