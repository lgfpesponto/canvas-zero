## Fotos nas Variações da Ficha (Bota / Cinto)

Adicionar suporte a URL de foto em cada variação, com visualização por QR code "auto-escaneado" e modo expandido paginado para campos multi-seleção.

### 1. Banco de dados
- Adicionar coluna `foto_url TEXT NULL` em `ficha_variacoes`.
- Sem mudança de RLS (permissões atuais já cobrem admin edita / todos leem).

### 2. Editor da ficha (`FichaFieldControls.tsx`)
- Novo campo "URL da foto" nos drafts (criar variação) e em `VarLine` (editar variação existente), ao lado do nome/preço.
- Salvar via `useInsertVariacao` / `useUpdateVariacao` (já genéricos).
- Também disponível no popover de checkbox (Tem/Não Tem) — 1 URL por opção "sim".
- Para produtos extras (`ExtraProdutoEditPopover`) — mesma coluna URL nas linhas de variação do JSONB.

### 3. Componentes novos
- `src/components/ficha/VariacaoFotoIcon.tsx` — ícone 👁 (Eye) clicável ao lado do nome, abre dialog com QR code (usa lib `qrcode.react` já presente ou instalar `qrcode.react`) da URL da foto. Sobre o QR, um `<img src={fotoUrl}>` cobrindo 100% (o "botão escanear" fica invisível/sempre acionado — a imagem carregada representa o "resultado do scan"). Fallback: se a imagem falhar, mostra o QR puro para escanear manualmente.
- `src/components/ficha/VariacaoExpandirDialog.tsx` — dialog paginado (3 variações por página, layout igual `TemplatesDialog`), cada card com foto (QR+overlay), checkbox, nome e preço. Usa o mesmo estado de seleção do campo pai (via props `selected` + `onToggle`).

### 4. Renderização nos formulários de pedido
Nos campos gerados dinamicamente (bota `DynamicOrderPage`, cinto `BeltOrderPage`, e checkbox tem/não tem):
- Ao lado do nome de cada variação com `foto_url`, renderizar `<VariacaoFotoIcon>`.
- Em campos `multipla` (multi-seleção como "Bordado do Cano", "Bordado da Gáspea" etc.), adicionar botão **"Expandir"** no header do campo que abre `VariacaoExpandirDialog`.
- Em `selecao` (1 variação) e `checkbox`, apenas o olhinho ao lado do nome.

### 5. Dependência
- Instalar `qrcode.react` (leve, ~10kb) para gerar QR client-side.

### 6. Fora do escopo
- Upload direto de foto (só URL manual por enquanto).
- Não afeta preços, histórico já é capturado pelos triggers existentes de versão da ficha.

### Arquivos afetados
- migration nova (add column)
- `src/components/ficha-edit/FichaFieldControls.tsx` (drafts + VarLine + checkbox)
- `src/components/extras/ExtraProdutoEditPopover.tsx` (URL nas variações do JSONB)
- `src/components/ficha/VariacaoFotoIcon.tsx` (novo)
- `src/components/ficha/VariacaoExpandirDialog.tsx` (novo)
- `src/pages/DynamicOrderPage.tsx` e `src/pages/BeltOrderPage.tsx` (renderizar olhinho + botão expandir)
- `src/hooks/useAdminConfig.ts` (garantir que `foto_url` passa nos mutations — já é genérico via spread)
- `package.json` (`qrcode.react`)
