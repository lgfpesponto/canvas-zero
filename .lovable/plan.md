## Replicar layout da Ficha Impressa no bloco "Detalhes da Bota"

Reescrever o **Bloco 2 — Detalhes** da página de pedido para espelhar exatamente a ficha PDF (foto enviada): cabeçalho compacto de identificação, divisor, grid de **3 colunas** com categorias (COUROS, PESPONTO, SOLADOS, BORDADOS, LASER E RECORTES, METAIS, EXTRAS, OBS, etc.), **sem os canhotos** do rodapé e **sem o QR** — no lugar dele, um link reduzido para a foto.

Esta mudança vale apenas para o caso **bota** (sem `tipoExtra`). Os blocos de **cinto** e **bota_pronta_entrega/extras** permanecem como estão hoje (já têm layout próprio).

### O que muda

**Bloco 2 (`src/pages/OrderDetailPage.tsx`)** — substituir a renderização atual (cards laranja em grid 2-col) pela estrutura da ficha:

1. **Mini-cabeçalho da ficha** (apenas informativo, dentro do bloco):
   - Coluna esquerda: `Código`, `Vendedor`, `Data`
   - Coluna direita (onde ficaria o QR): bloco "Foto de Referência" com link(s) — mostrando o nome curto do arquivo (ex.: `foto-1.jpg ↗`) em vez da URL completa, com `title` mostrando a URL inteira no hover. Cada link abre em nova aba (igual hoje).
   - Linha divisória horizontal abaixo.

2. **Grid de 3 colunas** com as mesmas categorias da ficha PDF, na mesma ordem:
   - IDENTIFICAÇÃO (sob medida / desenv. / cliente — quando existirem)
   - COUROS (Cano / Gáspea / Taloneira + cor)
   - PESPONTO (Linha / Borrachinha / Vivo)
   - SOLADOS (Tipo / Cor / Vira)
   - BORDADOS (Cano / Gáspea / Taloneira / Nome)
   - LASER E RECORTES
   - ESTAMPA
   - METAIS
   - EXTRAS (acessórios, tricê, tiras, franja, corrente, costura atrás, carimbo)
   - ADICIONAL
   - OBS
   - Cabeçalho de cada categoria: faixa cinza clara (`bg-muted`), texto pequeno bold uppercase — replicando o estilo dos retângulos cinza do PDF.
   - Itens: `Label:` em bold + valor em normal, na mesma linha quando couber, fonte pequena (`text-xs` / `text-sm`), espaçamento compacto.
   - Categorias se distribuem nas 3 colunas com balanceamento simples (ordem fixa preenchendo coluna por coluna, ou distribuídas em sequência — usaremos CSS columns para auto-balanceamento e quebra natural, mantendo categorias inteiras juntas com `break-inside: avoid`).

3. **Sem canhotos** (BORDADO / PESPONTO / EXPEDIÇÃO + código de barras): nada disso é renderizado no bloco — é exclusivo da impressão.

4. **Responsivo**: 3 colunas em `md+`, 2 em `sm`, 1 no mobile.

5. **Remover** o atual bloco "Foto de Referência" no fim do card (item 1047-1074) — o link da foto passa para o cabeçalho do bloco.

6. **Manter intacto**: bloco da observação grande (se existir e não couber inline em OBS, fica embutido na própria categoria OBS como hoje no PDF).

### Fonte de dados (reutilizar lógica do PDF)

Replicar exatamente o mesmo mapeamento usado em `src/lib/pdfGenerators.ts` (linhas 339-443): mesmas regras de fallback (ex.: `solado` → "Borracha", `formatoBico` → "quadrada"), mesma exclusão (cor vira "Bege"/"Neutra" não aparece), mesma substituição de "Bordado Variado" pela descrição. Para evitar duplicação, criamos um helper local `buildBootCategories(order)` no próprio arquivo (ou em `src/lib/orderFichaCategories.ts`) que retorna `Category[]` — e o usamos tanto na tela quanto, opcionalmente no futuro, no PDF.

### Detalhes técnicos

- **Layout**: `<div className="columns-1 sm:columns-2 md:columns-3 gap-6">` com cada categoria em `<div className="break-inside-avoid mb-4">`. Cabeçalho da categoria: `<div className="bg-muted px-2 py-1 text-[11px] font-bold uppercase tracking-wide mb-1.5">`. Itens: `<div className="text-xs leading-relaxed"><span className="font-bold">{label}</span> {value}</div>`.
- **Mini-cabeçalho**: grid 2 colunas. Esquerda mostra Código/Vendedor/Data (campos já presentes em `order`). Direita mostra o link da foto reduzido (extrair último segmento da URL com `url.split('/').pop()?.split('?')[0]`, truncar a 28 chars com `truncate` + `title={url}`).
- **Sem mexer**: Bloco 1 (informações base + valor) e Bloco 3 (históricos lado a lado) permanecem exatamente como estão.

### Arquivos a editar

- `src/pages/OrderDetailPage.tsx` — substituir o conteúdo do Bloco 2 quando não há `tipoExtra` (linhas ~1020-1074).
- (Opcional) `src/lib/orderFichaCategories.ts` — novo helper extraindo a lógica de categorias.

Posso aplicar?
