# Corrigir foto do produto no card de Estoque

## Diagnóstico
O campo `estoque_produtos.foto_url` guarda o link **bruto do Google Drive** (`https://drive.google.com/file/d/{ID}/view`) — o mesmo link usado para gerar o QR code da ficha do pedido raiz. Esse link não funciona em `<img src>` direto (o que explica o ícone quebrado mostrado no print do card). O projeto já tem o helper `src/lib/driveUrl.ts` (`isDriveUrl`, `toDriveImageUrl`, `toDrivePreviewUrl`) e o componente `FotoPedidoSidePanel.tsx` que faz exatamente essa conversão na visão detalhada dos pedidos.

## Mudanças

### 1. Novo componente `src/components/estoque/EstoqueFoto.tsx`
Reaproveita a mesma lógica do `FotoPedidoSidePanel`, em versão enxuta para card/preview:
- Se a URL é do Drive → tenta `<img src={toDriveImageUrl(url)}>` (CDN `lh3.googleusercontent.com/d/{id}`).
- Se a `<img>` falhar (`onError`) → faz fallback para `<iframe src={toDrivePreviewUrl(url)}>` (mesma tática do painel de fotos do pedido, que lida com arquivos privados/protegidos).
- Se não é Drive → renderiza `<img src={url}>` direto.
- Sem URL → placeholder com ícone `Package` (igual ao atual).
- Aceita props `url`, `alt`, `className`, e `grayscale` (para o estado SEM ESTOQUE).

### 2. `src/pages/EstoquePage.tsx`
- Substituir o `<img src={g.foto_url} …>` do card pelo novo `<EstoqueFoto url={g.foto_url} alt={g.nome} grayscale={semEstoque} className="w-full h-full object-cover" />`.
- Substituir o `<img src={previewProduct.foto_url} …>` do dialog "Ver" pelo mesmo componente (`className="w-full max-h-[400px] object-contain"`).
- Manter o overlay "SEM ESTOQUE" e o `grayscale` como hoje.

### 3. `src/components/estoque/EstoqueBuyDialog.tsx`
- Trocar o `<img src={produto.foto_url} …>` (thumb 16x16) pelo `<EstoqueFoto>` para consistência.

## Fora de escopo
- Nenhuma mudança em DB: `foto_url` já vem corretamente do link da ficha no momento de criar a grade (via `criarEstoqueBulk` / fluxo de Baixa Estoque). Só o **render** estava errado.
- Sem mexer em QR code novo — o "QR escaneado" do card é, na prática, a própria foto exibida via `lh3.googleusercontent.com`, exatamente como na visão detalhada do pedido.
