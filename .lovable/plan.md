## Ajustes no dialog de foto/QR

### Diagnóstico do "QR não lê"

A foto não aparece sobre o QR porque o link salvo em `foto_url` é do tipo `https://drive.google.com/file/d/{ID}/view` — o Google Drive **bloqueia** essa URL em `<img src>` (hotlink negado). Não é um problema de "botão de escanear" — o `<img>` já existe sobreposto ao QR, ele só está caindo no `onError` silenciosamente e ficando apenas o QR visível.

A solução real é converter Drive → URL direta de imagem antes de renderizar. Já existe o helper `toDriveImageUrl` em `src/lib/driveUrl.ts` que transforma para `https://lh3.googleusercontent.com/d/{ID}` (formato aceito em `<img>`).

### Mudanças

**1. `src/components/ficha/VariacaoFotoIcon.tsx` (`ScannedQr`)**
- Converter `fotoUrl` via `toDriveImageUrl` quando for link do Drive; senão usar a URL original.
- Manter o botão "Escanear" invisível/pressionado em cima do QR (aria-pressed, opacity-0) — a leitura visual é a própria imagem sobreposta.
- No dialog do olhinho: remover o parágrafo com o link (`<p>{fotoUrl}</p>`).

**2. `src/components/ficha/VariacaoExpandirDialog.tsx` — reduzir tamanho**
- Trocar `max-w-4xl` por algo menor para caber na tela sem scroll (referência: modelos rascunhos usa `max-w-5xl` mas com cards menores). Alvo: `max-w-3xl` no desktop.
- Reduzir aspecto/tamanho de cada card:
  - QR/foto: `aspect-square` → altura fixa menor (ex.: `h-32`/`h-36`), removendo o quadrado grande.
  - Padding e gap menores (`gap-3`, `p-1.5`).
- Continua 6 por página no desktop (3×2) e 2 no mobile (1×2), mas com cards compactos igual à visualização de rascunhos.

**3. Fora de escopo**
- Não mexer no `foto_url` salvo (continua sendo o link do Drive original — a conversão é só na exibição).
- Nenhuma migração de banco, nenhuma mudança de fluxo de compra.

### Arquivos afetados
- `src/components/ficha/VariacaoFotoIcon.tsx`
- `src/components/ficha/VariacaoExpandirDialog.tsx`
