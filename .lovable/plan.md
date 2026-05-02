## Garantir paridade total entre "Detalhes da Bota" e a ficha impressa

Comparando o helper atual `buildBootFichaCategories` (usado no novo Bloco 2) com o "ver-tudo" anterior (`detailsGrouped`) e com a ficha PDF, há campos selecionáveis no pedido que **não estão sendo exibidos** quando preenchidos. Vamos completar o helper para que toda seleção apareça — tanto na tela quanto, futuramente, na ficha impressa (mesma fonte de dados).

### Campos que podem sumir hoje e serão garantidos

**METAIS**
- `Bola Grande` (`extraDetalhes.bolaGrandeQtd`) — não aparece em lugar nenhum no helper atual.
- Linha "Metais:" só aparece se `order.metais` existir. Se o pedido tiver apenas `tipoMetal` ou `corMetal` (sem área), nada é mostrado — passa a renderizar mesmo assim.

**EXTRAS**
- `Tricê = "Sim"` sem descrição → some hoje (exige `triceDesc`). Passa a mostrar "tricê: sim".
- `Tiras = "Sim"` sem descrição → mesmo problema, mesma correção.
- `Franja` / `Corrente` quando vêm como flags em `order.franja`/`order.corrente === 'Sim'` (em vez de `extraDetalhes.franja`/`corrente`) → também passam a aparecer.

**Verificação cruzada** (já cobertos, sem mudança):
- IDENTIFICAÇÃO: sob medida, desenvolvimento, cliente. ✓
- COUROS: cano, gáspea, taloneira + cor. ✓
- PESPONTO: linha, borrachinha, vivo. ✓
- SOLADOS: tipo (solado + formatoBico), cor, vira (com filtro Bege/Neutra igual à ficha). ✓
- BORDADOS: cano, gáspea, taloneira (com substituição de "Bordado Variado" pela descrição) + nome. ✓
- LASER E RECORTES: laser cano/gáspea/taloneira + glitter, recorte cano/gáspea/taloneira + cor, pintura. ✓
- ESTAMPA, CARIMBO, COSTURA ATRÁS, ACESSÓRIOS, ADICIONAL, OBS. ✓

### Arquivos a editar

- `src/lib/orderFichaCategories.ts` — ampliar blocos METAIS e EXTRAS conforme acima.

Não toco no layout do Bloco 2 nem no PDF — só no helper compartilhado, então a tela e (no futuro) o PDF passam a refletir o mesmo conjunto completo.

Posso aplicar?
