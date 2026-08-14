# Impedir variações repetidas na ficha + unificar as já existentes

## O que está acontecendo

No modo "editando ficha" do Faça seu Pedido é possível salvar duas variações com o mesmo nome no mesmo campo. Hoje existem duplicatas reais no banco, por exemplo:

- Bordado do Cano: "PA2045PERF.DST" (R$35) aparece 2 vezes, idêntica em preço, foto e relacionamento
- Cor do Couro: "Preto", "Madeira", "Preto e Branco"
- Cor do Couro do Cano / Gáspea / Taloneira: "Nescau chapado"
- Cor da Sola: "Marrom" — Carimbo a Fogo: "Até 3 Carimbos", "Até 6 Carimbos"
- Tamanho: várias duplicatas exatas (24 a 45)

Como os pedidos guardam a variação pelo **nome em texto** (não pelo id), unificar linhas idênticas não muda nenhum pedido existente: pedidos que hoje usam qualquer uma das cópias passam automaticamente a apontar para a única variação restante, com o mesmo nome e preço.

## O que será feito

### 1. Bloquear duplicatas na criação/edição (frontend)
No popover de edição de campo da ficha (modo edição):
- ao salvar uma nova variação (ou renomear uma existente), comparar o nome normalizado (minúsculas, sem espaços extras) com as demais variações do mesmo campo, incluindo os rascunhos ainda não salvos
- se já existir, bloquear o salvamento e mostrar aviso: "Já existe a variação 'X' neste campo"
- destacar o campo de nome duplicado em vermelho

### 2. Unificar as duplicatas existentes (migração)
Migração que, para cada campo, mantém a linha mais antiga de cada grupo de variações **exatamente iguais** (mesmo campo, mesmo nome normalizado, mesmo preço, mesma foto, mesmo relacionamento e mesma categoria) e remove as cópias extras.

Duplicatas de nome que tenham preço/relacionamento **diferentes** não serão apagadas automaticamente — elas seriam uma mudança de regra de preço. Se aparecerem, listo depois para você decidir.

### 3. Proteção no banco
Índice único parcial em `ficha_variacoes` sobre (campo_id, nome normalizado) apenas para linhas ativas com o mesmo relacionamento, evitando que a duplicidade volte por qualquer caminho (UI, importações, etc.).

## Detalhes técnicos

- `src/components/ficha-edit/FichaFieldControls.tsx`: validação de nome duplicado antes de `useInsertVariacao` / `useUpdateVariacao`, considerando `variacoes` do campo + `drafts` locais.
- Migração SQL: `DELETE` mantendo `min(ctid/created)` por chave de agrupamento exata; depois `CREATE UNIQUE INDEX` parcial em `lower(btrim(nome))` por `campo_id` (apenas `ativo = true`).
- Nenhuma alteração em `orders` é necessária (valores salvos como texto).
