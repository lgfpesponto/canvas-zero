## Escalação do estoque E009 + filtro permanente

Mesmo formato que fizemos para o E008 dia 20/05, agora para o E009 — e depois deixar isso reaproveitável no relatório oficial.

### 1. PDF agora (E009)

Gerar um PDF Escalação aqui no chat com todos os pedidos cujo `numero` começa com `E009` (vendedor "Estoque").

- Critério: `numero ILIKE 'E009%'` e `solado` preenchido (mesma regra do relatório de Escalação).
- Sem filtro de etapa — pega todos os E009 que ainda existem na produção (hoje, da consulta, todos estão em "Pesponto Ailton").
- Mesmo layout do PDF do E008: badge "SOLA", linha descritiva `solado bico {bico} cor {corSola} [vira {corVira}]`, tabela de tamanhos, total de pares e combinações no topo.
- Script Python com `reportlab`, QA visual com `pdftoppm` antes de entregar.
- Salvar em `/mnt/documents/Escalacao_E009_Estoque.pdf` e anexar como artifact.

### 2. Filtro "Número do Estoque" no relatório de Escalação (app)

Em `src/components/SpecializedReports.tsx`:

- Adicionar um state `filterNumeroEstoque: string` (vazio = sem filtro).
- Renderizar um `input` de texto no painel de filtros, **só aparece quando `activeReport === 'escalacao'`**, logo abaixo do filtro de Vendedor.
  - Label: "Número do Estoque (opcional)"
  - Placeholder: "Ex: E009"
  - Helper: "Filtra apenas pedidos cujo número começa com esse prefixo (ex: estoques)."
- Em `generateEscalacaoPDF`, aplicar mais um critério no `filtered`:
  ```ts
  (!filterNumeroEstoque || o.numero?.toLowerCase().startsWith(filterNumeroEstoque.toLowerCase()))
  ```
- Quando preenchido, sobrescrever o label/arquivo do PDF para incluir o prefixo (`Escalação - E009 - …pdf`) e mostrar no cabeçalho do PDF: `ESCALAÇÃO — E009 — …`.
- Resetar o campo quando trocar de tipo de relatório (já que só o Escalação usa).

Sem mudança em banco, RLS, ou outros relatórios. Apenas frontend.

### Validação

- Conferir que com o campo vazio o relatório continua igual.
- Conferir que com `E009` retorna só os pedidos do estoque E009 e o nome do arquivo reflete isso.
- Confirmar que o snapshot em `pdf_snapshots.filtros` passa a registrar `numeroEstoque` também.
