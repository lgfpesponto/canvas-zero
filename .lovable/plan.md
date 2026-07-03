## Ajuste no card de modelos: checkbox junto ao botão, nome reduzido e foto inteira

### Objetivo
Refinar o card do diálogo **Modelos Salvos** para priorizar a visualização da foto completa, reduzir o destaque do nome e reposicionar o checkbox de seleção em lote.

### Alterações previstas

1. **`src/components/template/TemplatesDialog.tsx` — `TemplateCard`**
   - **Foto sem corte**: trocar `object-cover` por `object-contain` na imagem do modelo, para que a foto inteira apareça dentro do espaço do card (sem cortar laterais/topos).
   - **Checkbox junto ao botão**: mover o `<Checkbox>` da linha do nome para a linha de ações, posicionando-o à esquerda do botão **Preencher** (mesma linha do botão e do menu ⋮).
   - **Nome reduzido**: diminuir a fonte do nome para `text-xs` e limitar a 2 linhas com `line-clamp-2`, mantendo o nome completo disponível via tooltip (`title`).
   - Ajustar espaçamentos internos para que o card continue limpo com o novo layout.

2. **Layout preservado**
   - Grid 3×2 (6 modelos por página).
   - Paginação com setas laterais.
   - Placeholder "Sem foto" permanece para modelos sem imagem.
   - Scanner físico continua funcionando (lógica inalterada).

### Não altera
- Dados de modelos, busca, multi-seleção e comportamento do scanner.
- Páginas de pedido (`OrderPage.tsx`, `BeltOrderPage.tsx`).
- PDFs ou lógica de preenchimento.

### Resultado esperado
Cards exibem a foto completa (sem cortes), nome compacto abaixo da foto, e checkbox de seleção ao lado do botão **Preencher**.