# Ajustes finais no rastreio público (/rastreio/:id)

## 1. Logo da 7Estrivos no cabeçalho
- Copiar `user-uploads://image-155.png` para `src/assets/logo-7estrivos.png` e importar em `PublicTrackingPage.tsx`.
- Remover o círculo laranja "7E" **e** o subtítulo "7 Estrivos". Fica só a logo (ferradura) + o título.

## 2. Título
- `"acompanhe a produção do seu pedido"` → `"Acompanhe a produção do seu pedido"` (A maiúsculo).
- O `document.title` também passa a usar "Acompanhe…".

## 3. Stepper — última etapa
- Em `PROGRESS_STEPS`, trocar o label `"Entregue"` por `"Entregue ao vendedor"` (mantém os mesmos `matches`).

## 4. Detalhes do pedido no formato da Ficha interna (com foto auto-"escaneada")
Hoje a seção "Detalhes do pedido" lista os campos em duas colunas chave/valor e mostra um QR Code.
Trocar por algo equivalente ao bloco **"Detalhes da Bota"** do `OrderDetailPage`:

- Substituir a renderização atual de `camposPreenchidos` por **`buildBootFichaCategories(order, { showCliente: false })`** (`src/lib/orderFichaCategories.ts`) — exatamente os mesmos blocos COUROS / PESPONTO / SOLADOS / BORDADOS / LASER E RECORTES / METAIS / EXTRAS / ADICIONAL / OBS usados no portal interno e no PDF. `showCliente: false` garante que o nome do cliente nunca aparece.
- Cabeçalho do card com **Código, Vendedor, Data, Tamanho, Modelo** (mesmo cabeçalho da ficha interna), sem preço/cliente.
- Layout em 2 colunas no desktop: à esquerda a ficha, à direita a **foto do pedido** (primeira URL `http*` em `order.fotos`, convertida com `toDirectImageUrl` de `src/lib/driveUrl.ts`). É o mesmo helper já usado no `FotoPedidoSidePanel`. Sem botão "escanear" visível — a foto já entra renderizada (efeito de QR sempre escaneado). Se não houver foto, mostra um placeholder discreto "Sem foto de referência".
- Para pedidos que **não são bota** (extras/cinto), cai num fallback simples só com a foto + lista chave/valor atual.

### Remover o QR Code visível
O QR atual aponta para o link da foto no Drive — como agora a foto já aparece embutida, o QR deixa de fazer sentido nessa página. Removo o `qrUrl` / `QRCode.toDataURL` e a importação de `qrcode`.

## Arquivos
- `src/pages/PublicTrackingPage.tsx` — refactor da seção header + detalhes, troca de label, remoção do QR.
- `src/assets/logo-7estrivos.png` (novo, copiado do upload).

## Fora de escopo
- Mexer no preço/cliente (continuam protegidos pela RPC `get_public_tracking`).
- Mudar a aba/favicon do navegador.
