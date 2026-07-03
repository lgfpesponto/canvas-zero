## Ajuste visual: foto no lugar do QR Code (QR invisível)

### Objetivo
No diálogo **Modelos Salvos**, o QR Code não deve ser exibido visualmente. A foto escaneada do modelo ocupa o espaço do QR, e modelos sem foto exibem um placeholder.

### Alterações previstas

1. **`src/components/template/TemplatesDialog.tsx`**
   - Remover o bloco `<QRCodeSVG>` visível do `TemplateCard`.
   - Substituir por uma única área de imagem no topo do card, usando `foto_url` quando existir.
   - Se não houver `foto_url`, exibir um placeholder (`ImageOff` ou similar) em fundo suave.
   - Manter o mesmo tratamento para imagens do Google Drive (`toDriveImageUrl`) e `referrerPolicy="no-referrer"`.
   - Garantir que o scanner físico continue funcionando: a lógica de `window keydown` + `7EMODEL:<uuid>` permanece inalterada, apenas o QR não é renderizado na UI.

2. **Layout preservado**
   - Grid 3×2 (6 modelos por página).
   - Paginação com setas laterais.
   - Nome, checkbox, badge "Novo" e botões de ação permanecem abaixo da imagem.

### Não altera
- Dados de modelos (interface, props, busca, multi-seleção).
- Comportamento de escaneamento físico.
- Páginas de pedido (`OrderPage.tsx`, `BeltOrderPage.tsx`).
- PDFs ou lógica de preenchimento de formulários.

### Resultado esperado
Cards de modelo mostram apenas a foto no topo, sem QR Code visível. Modelos sem foto exibem placeholder. Scanner continua carregando modelos via código `7EMODEL:<id>`.