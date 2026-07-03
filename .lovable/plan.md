## Ajustar diálogo "Modelos Salvos" no mobile

Componente: `src/components/template/TemplatesDialog.tsx`.

Hoje a lista usa `PAGE_SIZE = 6` fixo e grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. No celular fica 1 coluna com 6 itens, o que no aparelho do usuário aparece sem a foto por falta de espaço vertical (a área da foto é empurrada para fora).

### Mudanças (puramente visuais)

1. **Tamanho de página responsivo**  
   - Importar `useIsMobile` de `@/hooks/use-mobile`.  
   - Substituir a constante `PAGE_SIZE = 6` por `const PAGE_SIZE = isMobile ? 2 : 6;` dentro do componente.  
   - Ajustar o `useEffect([search, templates.length])` que reseta `page` para também depender de `isMobile` (evita ficar em página inexistente ao girar/redimensionar).

2. **Card com a mesma cara do desktop no mobile**  
   - Manter o layout atual do `TemplateCard` (foto em cima + nome + linha de ações).  
   - Aumentar levemente a altura da foto no mobile para dar a mesma leitura visual do desktop: `h-40` → `h-48 sm:h-40` (foto maior no celular já que agora só cabem 2).  
   - Manter grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — no mobile continuam empilhados verticalmente (um em cima, outro embaixo), exatamente como pedido.

3. **Paginação**  
   - Sem mudança estrutural: os botões `ChevronLeft` / `ChevronRight` e o rodapé "Página X de Y" continuam funcionando; só passam a paginar de 2 em 2 no celular.

### Fora de escopo

- Não altero regras de negócio, seleção em lote, scanner, edição, exclusão ou envio.  
- Nada muda em desktop/tablet além da altura da foto (que só cresce no breakpoint mobile).
