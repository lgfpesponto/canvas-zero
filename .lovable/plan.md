

## Diagnóstico inicial: site lento ou não carrega

### O que verifiquei (modo leitura)
- **Dev server**: rodando normal (Vite v5.4.19, sem erros)
- **Console do browser**: sem erros nos logs capturados
- **Network**: nenhuma requisição falhada nos logs capturados
- **TypeScript**: compila sem erros
- **Banco Supabase**: nenhum erro/fatal nos logs recentes
- **Sessão atual**: o preview está carregando normalmente (replay mostra Hero + botões renderizados)

### Causas mais prováveis

Como não consigo reproduzir o problema agora, vejo 4 causas plausíveis pelo histórico recente de mudanças:

1. **Cache do Service Worker / build antigo no navegador**  
   Após várias mudanças seguidas (ReportsPage, OrderDetailPage, pdfGenerators, hooks de couro), o navegador pode ter ficado com chunks JS antigos em cache que não combinam com a nova versão. Isso causa tela branca, "loading infinito" ou erro silencioso de import.

2. **Re-renders pesados em `ReportsPage`**  
   A página agora mantém um `Map` extra (`scannedOrdersMap`) e o `useMemo` de `ordersToExport` recria um Map a cada mudança de `serverOrders`. Em listas grandes (centenas de pedidos), isso pode travar a UI por alguns segundos ao trocar de página ou aplicar filtro.

3. **Consulta lenta no Supabase**  
   `useOrders` busca pedidos paginados + contagem total. Se a tabela cresceu muito ou se houver filtros aplicados sem índice adequado, a primeira carga pode demorar 5–15s. Edge logs do Supabase ajudariam a confirmar.

4. **Hook `useFichaVariacoesLookup` carregando muitas variações**  
   Foi atualizado recentemente para incluir 3 categorias novas de couro. Se faz query sem cache/limit, pode atrasar render de OrderPage / EditOrderPage.

### Plano de investigação (em modo execução)

1. **Coletar evidência objetiva** — pedir ao usuário (ou usar browser tools quando aprovado) para reproduzir uma vez com DevTools aberto, e em paralelo eu inspeciono:
   - Edge logs do Supabase (latência das queries)
   - Postgres logs (slow queries)
   - Network do preview ao vivo
2. **Mitigar cache** — adicionar uma query string de versão ao `index.html` ou orientar o usuário a fazer hard refresh (Ctrl+Shift+R) e confirmar se resolve. Se sim, é cache.
3. **Otimizar `ReportsPage`** se confirmado o gargalo:
   - Trocar o `Map` em estado por `useRef` (não dispara re-render)
   - Memoizar `serverOrders.map(o => [o.id, o])` em separado
4. **Revisar query de `useOrders`** — se demorando, adicionar `select` mais enxuto e garantir índice em `(data_criacao desc, hora_criacao desc)`.

### Perguntas para focar o diagnóstico
- O problema acontece **em qualquer página** ou só em **/relatorios**?
- Acontece para **todos os usuários** ou só para administradores (que têm dashboards mais pesados)?
- É **lento** (carrega depois de 10–30s) ou **trava de vez** (tela branca permanente)?
- Aparece logo ao abrir o site, ou depois de **alguma ação específica** (escanear, abrir detalhes, gerar PDF)?

### O que NÃO vou mudar antes de confirmar a causa
- Lógica de pedidos, preços, ou PDFs
- Estrutura do banco
- Auth / RBAC

Sem essas respostas, qualquer "otimização" agora é chute e pode introduzir bug pior. Prefiro confirmar o sintoma exato antes de tocar em código.

