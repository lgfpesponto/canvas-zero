## Problema

Hoje, ao escanear códigos de barras na página de Relatórios, o usuário precisa clicar no campo de input entre cada leitura, quebrando o fluxo de seleções múltiplas.

Causas identificadas em `src/pages/ReportsPage.tsx`:

1. O input do scanner usa `disabled={scanning}`. Enquanto a busca acontece (mesmo que rápida), o input fica desabilitado e **perde o foco**. Leitores de código de barras digitam muito rápido — o segundo scan chega antes do foco voltar.
2. Após cada scan bem-sucedido, `setScanFilterId(match.id)` filtra a lista para mostrar só o último pedido escaneado. Isso muda a tela e dá a sensação de que cada scan é uma ação isolada.
3. Não há `refocus` automático no input após `setScanning(false)`.

## Solução

Tornar o scanner um campo "sempre pronto" para receber a próxima leitura, sem interrupções:

### Mudanças em `src/pages/ReportsPage.tsx`

1. **Remover `disabled={scanning}`** do input do scanner (manter apenas no botão "Buscar"). O input continua ativo e mantém o foco mesmo durante a busca.
   - Mostrar o estado "buscando" apenas via ícone (`Loader2`) e placeholder, sem desabilitar.
   
2. **Reaplicar foco automaticamente** após cada scan (sucesso ou erro), usando `scanInputRef.current?.focus()` ao final do `handleScan` (no `finally`).

3. **Não filtrar a lista por scan** — remover `setScanFilterId(match.id)` do fluxo de scan do admin. O `scanFilterId` e a lógica relacionada (linhas 145, 248, 405, 725) podem ser descontinuados, já que o admin acompanha os escaneados pelo painel "Visualizar pedidos selecionados" que já existe.

4. **Fila simples para scans muito rápidos**: se um scan chegar enquanto `scanning=true`, em vez de descartar (`if (scanning) return`), enfileirar a próxima leitura para processar logo em seguida. Implementação leve com `useRef<string[]>` de pendentes processada após cada conclusão.

5. **Beep e toast continuam** como feedback de sucesso/erro/duplicado, sem mudar a tela.

## Resultado

- Escanear N códigos em sequência sem tocar no mouse ou teclado.
- Cada leitura adiciona à seleção, toca o beep e mantém o foco no campo.
- A lista de pedidos não é filtrada a cada scan — o usuário vê todos os selecionados pelo painel "Visualizar pedidos selecionados".
- Códigos duplicados continuam avisando (beep de erro + toast).
