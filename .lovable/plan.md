## Mudanças

### 1. `index.html` — preview do link compartilhado
Atualizar as meta tags para que ao colar o link (WhatsApp, etc.) apareça:
- **Título**: `Rastreie a produção`
- **Descrição**: `Acompanhe a produção do seu pedido em tempo real`
- **Imagem**: remover `og:image` e `twitter:image`

Mudar também `<title>` e `<meta name="description">` apenas dentro das tags `og:` / `twitter:`? Não — o `<title>` do navegador continua "Portal 7estrivos" (faz sentido na home). Só mudo as og/twitter para o texto novo, e removo as duas linhas de imagem.

**Aviso**: WhatsApp/Facebook fazem cache dos previews antigos. O link já compartilhado vai continuar mostrando a prévia velha por um tempo até o serviço reescanear. Para forçar agora: usar o Facebook Sharing Debugger (`developers.facebook.com/tools/debug`) com o link.

### 2. `src/pages/PublicTrackingPage.tsx` — ajustes de layout

**a) Cabeçalho (header) — quebrar título em duas linhas no mobile**
- "Acompanhe a produção" em uma linha
- "do seu pedido" na linha de baixo
- Implementação: usar `<br className="sm:hidden" />` entre as duas partes, mantendo o desktop em uma linha só.

**b) Cabeçalho do pedido — mover "Etapa atual" para abaixo de "Vendedor"**
- Hoje "Etapa atual" aparece embaixo do stepper (na seção Etapas de produção).
- Adicionar nova linha logo abaixo de "Vendedor: …" mostrando `Etapa atual: <status em laranja>`.
- Manter também na seção de etapas (já existe) — o pedido pediu para mostrar ali também; vou manter nos dois lugares conforme solicitado ("tanto no desktop tanto no mobile" abaixo de vendedor).
- Aplica desktop e mobile.

**c) Stepper de etapas — corrigir sobreposição no mobile**
- Problema: 8 etapas em uma linha só → labels colidem.
- Solução: no mobile (`< sm`), trocar o layout horizontal por **grid de 4 colunas × 2 linhas** (4 por linha para caber bem em 320–414px com bolinhas maiores e labels legíveis). No desktop mantém o stepper horizontal atual.
- Cada célula: bolinha (um pouco maior, `w-8 h-8`) + label abaixo (text-xs).
- Conectores horizontais entre bolinhas: ocultos no mobile (grid não comporta); manter só no desktop.
- Resultado: nada sobreposto, respeita padding do card, labels inteiras visíveis.

> Observação: o usuário sugeriu "3 por linha". Optei por 4 por linha porque 8 etapas dividem certinho em 4×2 (sem célula vazia). Se preferir 3 por linha (3+3+2), me avise e ajusto.

## Fora de escopo
- Não mexo na lógica de etapas, RPC, nem em outras páginas.
- Não mexo no `<title>` da home nem em outras meta tags fora das listadas.
