## 1) Desenvolvimento como PRIMEIRO campo de cada categoria

Em `src/pages/OrderPage.tsx`, mover os blocos "Desenvolvimento (+R$50/100/150)" para serem o primeiro item logo após o cabeçalho da seção:

- **BORDADOS**: Desenvolvimento +R$50 antes de "Tipo de Bordado".
- **LASER E RECORTES**: Desenvolvimento +R$100 antes do primeiro campo (Laser).
- **ESTAMPA**: Desenvolvimento +R$150 antes do toggle Estampa.
Sem mudança de lógica de preço/persistência — só reordenar JSX.

## 2) Botões flutuantes (olho + página) do lado da ficha

Em `src/components/FotoPedidoSidePanel.tsx`, trocar o wrapper dos botões:

- Atual: `mt-3 flex justify-end gap-2` (encostam na direita)
- Novo: `mt-3 flex justify-start gap-2` (encostam à esquerda do painel, ficando visualmente ao lado da ficha)
Continuam sticky junto do `aside`, tamanho e ícones inalterados.

## 3) Redesenho do dialog "Modelos Salvos"

Reescrever o bloco em `OrderPage.tsx` (linhas ~1913-1970) e o equivalente em `BeltOrderPage.tsx`.

### Layout de cada card

```text
┌──────────────────────────────────┐
│  [QR code 96x96]   [ ] Nome  ⋮  │
│                                  │
│  [Preencher]                     │
└──────────────────────────────────┘
```

- Foto do modelo **em cima** (miniatura clicável abrindo Drive), largura total do card, altura ~140px, `object-cover`.
- Se o modelo tem `foto_url`: renderiza QR code (biblioteca `qrcode.react` — instalar via `bun add qrcode.react`) contendo `${MODEL_SCAN_PREFIX}${template.id}` (ex.: `7EMODEL:<uuid>`). Tamanho compacto (~72px) sobreposto no canto da foto, ou abaixo da foto — **abaixo da foto, alinhado à esquerda, ao lado do nome**.
- Nome do modelo em negrito abaixo.
- Checkbox de seleção em lote fica **do lado do nome** (não mais no início da linha).
- Botão **Preencher** (laranja, grande) + **⋮ (MoreVertical)** DropdownMenu à direita.
- Dropdown itens em ordem: **Enviar modelo** (Send), **Editar** (Pencil), **Excluir** (Trash2, destructive).

### Scanner físico invisível (auto-preencher)

- Ao abrir o dialog: montar um `<input type="text" />` invisível (`className="sr-only" autoFocus`) que **rerouba foco** em `onBlur` — enquanto o dialog estiver aberto ele fica sempre focado.
- Handler `onKeyDown`: acumula caracteres; quando recebe `Enter` (leitores USB enviam Enter no final), lê o buffer.
- Se buffer começa com `7EMODEL:` → extrai o UUID, busca o template correspondente na lista carregada e chama `handleUseTemplate(template)` → fecha o dialog automaticamente. Limpa buffer.
- Se não bater com o prefixo, ignora silenciosamente.
- Toast de confirmação: "Modelo &nbsp; carregado via scanner".

### Paginação de 5 por página

- State novo `templatePage` (default 1).
- Após aplicar filtro por `templateSearch`, paginar `filtered` em fatias de 5:
  - `pageItems = filtered.slice((page-1)*5, page*5)`
  - `totalPages = Math.max(1, Math.ceil(filtered.length / 5))`
- Rodapé do dialog: `« ‹  Página X de Y  › »` (usar `Button` `ghost` `sm`).
- Quando `templateSearch` muda, resetar `page` para 1 (useEffect).
- "Mostrar sempre 5 últimos modelos" = a lista já vem ordenada por `created_at desc` do hook; a página 1 sempre mostra os 5 mais recentes. Confirmado com ordenação existente em `useTemplateManagement`.

## 4) Aplicar mesmas mudanças em BeltOrderPage

- Dialog "Modelos Salvos" (cinto): mesmo redesenho, QR + scanner + paginação, filtrando `__tipo === 'cinto'`. O scanner reconhece `7EMODEL:<uuid>` de cintos e chama `handleUseTemplate` do belt.
- Reordenar Desenvolvimento: **não se aplica** (cinto não tem categorias Bordado/Laser/Estampa).

## Fora de escopo

- Nenhuma mudança de schema; QR carrega apenas o `id` do template já existente.
- Sem alteração no fluxo de preço, PDF ou ficha.
- Sem câmera nem leitor via webcam — apenas leitor físico USB/Bluetooth.

## Arquivos alterados

- `src/pages/OrderPage.tsx` — reordenar Desenvolvimento, redesenhar dialog Modelos.
- `src/pages/BeltOrderPage.tsx` — redesenhar dialog Modelos.
- `src/components/FotoPedidoSidePanel.tsx` — alinhar botões flutuantes à esquerda.
- `package.json` — adicionar `qrcode.react`.