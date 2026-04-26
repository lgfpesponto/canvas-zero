
# Visualizar foto do pedido dentro do portal

## Objetivo

Adicionar um botão **"Ver foto"** no cabeçalho do detalhe do pedido (ao lado do nome do cliente/vendedor) que, ao clicar, abre a imagem **dentro do portal em um modal** — sem redirecionar para o Google Drive.

## Desafio técnico: links do Google Drive

O link salvo em `order.fotos[0]` geralmente vem no formato:
```
https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing
```

Esse formato **não funciona** direto em `<img src>` (o Drive bloqueia hotlink na URL `/view`). Precisamos converter:

- **Imagem direta**: `https://lh3.googleusercontent.com/d/{FILE_ID}` (funciona em `<img>`, fotos públicas)
- **Fallback (iframe)**: `https://drive.google.com/file/d/{FILE_ID}/preview` (funciona em `<iframe>`, cobre PDFs e imagens privadas)

## Plano

### 1. Helper `src/lib/driveUrl.ts` (novo)

Funções: `getDriveFileId(url)`, `toDriveImageUrl(url)`, `toDrivePreviewUrl(url)`, `isDriveUrl(url)`. Extraem o ID do arquivo de qualquer formato Drive (`/file/d/ID/view` ou `?id=ID`) e geram a URL apropriada.

### 2. Componente `src/components/FotoPedidoDialog.tsx` (novo)

- Recebe `url`, `open`, `onOpenChange`.
- Se URL do Drive → tenta `<img src={toDriveImageUrl(url)}>` primeiro.
- Em `onError` da imagem, faz fallback automático para `<iframe src={toDrivePreviewUrl(url)}>`.
- Se URL não-Drive (ex.: `.jpg` direto) → `<img>` direto.
- Botão extra "Abrir no Drive ↗" no canto.
- Layout: `Dialog` com `max-w-4xl w-[90vw] max-h-[90vh]`, imagem com `object-contain`.

### 3. Modificar `src/pages/OrderDetailPage.tsx`

**No cabeçalho** (próximo à linha 362, ao lado do número/vendedor):
- Botão "Ver foto" com ícone `ImageIcon` (lucide), **somente se** `order.fotos[0]` for URL `http(s)`.
- Mais de 1 foto válida → "Ver fotos (N)".
- Click → abre `FotoPedidoDialog` com `order.fotos[0]`.
- Estado: `const [fotoOpen, setFotoOpen] = useState(false);`
- Visível para todos que acessam a página (admin + vendedor dono).

### 4. Seção "Foto de Referência" existente (linhas 548-564)

Sem mudanças. O botão do topo é apenas um atalho visual; a seção continua listando todos os links.

## Comportamento esperado

| Cenário | Resultado |
|---|---|
| Link Drive `/file/d/.../view` | Modal abre `<img>` via `lh3.googleusercontent.com`; se falhar, cai para `<iframe>` preview |
| Link direto `.jpg`/`.png` | Modal abre `<img>` direto |
| Sem fotos | Botão não aparece |
| 2+ fotos | "Ver fotos (2)"; modal mostra a primeira |
| Imagem privada do Drive | Fallback iframe (pede login se necessário) |

## Sem mudanças de banco / backend

Nenhuma migração, RPC ou edge function. `order.fotos` já é populado. Sem libs novas — `<img>`/`<iframe>` nativos + Dialog shadcn.

## Arquivos afetados

- ➕ `src/lib/driveUrl.ts` (~25 linhas)
- ➕ `src/components/FotoPedidoDialog.tsx` (~70 linhas)
- ✏️ `src/pages/OrderDetailPage.tsx` (botão + estado + import)
