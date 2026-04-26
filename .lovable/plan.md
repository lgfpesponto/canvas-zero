## Objetivo

Trocar o **modal** atual por um **painel lateral fixo à direita** que mostra a foto do pedido enquanto o usuário continua navegando, lendo e editando a ficha. A foto fica grudada na lateral, sem bloquear o conteúdo (sem overlay escuro, sem capturar foco).

## Comportamento esperado

| Ação | Resultado |
|---|---|
| Clicar em "Ver foto" no header | Painel desliza da direita, ocupa ~420px e empurra o conteúdo |
| Painel aberto + clicar em "Editar" (lápis) | Vai para a página de edição **com a foto ainda visível** (lembra estado) |
| Painel aberto + scroll na ficha | Foto continua visível (sticky no topo da lateral) |
| Botão X dentro do painel | Fecha (volta ao layout normal full-width) |
| Sem foto | Botão "Ver foto" não aparece (igual hoje) |
| Mobile (<768px) | Painel vira overlay full-screen tipo Sheet (não cabe lateral) |

## Mudanças

### 1. Novo: `src/components/FotoPedidoSidePanel.tsx`

Substitui o uso do `FotoPedidoDialog` na `OrderDetailPage`. Componente puro de apresentação:

- Container **sticky**: `sticky top-4 self-start` dentro de uma coluna do grid pai.
- Largura: `w-[420px]` desktop / `w-full` mobile.
- Cabeçalho compacto: título "Foto do pedido" + botão **X** (fecha) + botão **"Abrir no Drive ↗"**.
- Corpo: mesma lógica de `<img>` Drive direto (`lh3.googleusercontent.com/d/{ID}`) com fallback automático para `<iframe src=".../preview">` em `onError` — reaproveita helpers já criados em `src/lib/driveUrl.ts`.
- Imagem com `max-h-[calc(100vh-8rem)] object-contain` para nunca estourar a viewport.
- Sem overlay, sem `Dialog`, sem foco-trap → não atrapalha edição da ficha.

### 2. `src/pages/OrderDetailPage.tsx`

**Layout**: envolver o `bg-card rounded-xl ...` (linha 365) e o painel num grid responsivo:

```tsx
<div className={`grid gap-4 ${fotoOpen ? 'lg:grid-cols-[1fr_420px]' : 'grid-cols-1'}`}>
  <div className="bg-card rounded-xl ..."> ...ficha existente... </div>
  {fotoOpen && temFoto && (
    <FotoPedidoSidePanel url={fotosValidas[0]} onClose={() => setFotoOpen(false)} />
  )}
</div>
```

- `fotoOpen` já existe (linha 47) — só muda o que ele renderiza.
- Botão "Ver foto" (linhas 380-389) continua igual; só passa a alternar o painel lateral em vez do dialog.
- Em telas `<lg`, o painel cai abaixo (grid colapsa naturalmente em 1 coluna).
- Remover import e uso de `FotoPedidoDialog`; adicionar `FotoPedidoSidePanel`.

### 3. Persistência durante edição (a parte importante)

Hoje, clicar no lápis chama `navigate('/pedido/${id}/editar')` — sai da página e perde o estado `fotoOpen`. Para "manter a foto aberta ainda":

**Opção escolhida — query param `?foto=1`**:
- Quando `fotoOpen=true` e o usuário clica em editar, navegar para `/pedido/${id}/editar?foto=1`.
- Em `EditOrderPage` e `EditExtrasPage`: ler `searchParams.get('foto')`, e se `=1` renderizar o mesmo `FotoPedidoSidePanel` ao lado do formulário (mesmo grid 2 colunas).
- Botão X no painel também remove o param da URL (`navigate(pathname)`).
- Ao salvar/voltar, o param é preservado nos `navigate` de retorno, mantendo a foto aberta também na página de detalhe.

Essa abordagem evita criar contexto global e funciona em refresh/deep-link.

### 4. Helpers já existentes (sem mudanças)

- `src/lib/driveUrl.ts` (`isDriveUrl`, `toDriveImageUrl`, `toDrivePreviewUrl`, `isHttpUrl`) — reaproveitados.
- `FotoPedidoDialog.tsx` — pode ser **removido** (não usado mais) ou mantido caso queira manter o modal como alternativa. Plano: **remover** para evitar código morto.

## Arquivos afetados

- ➕ `src/components/FotoPedidoSidePanel.tsx` (~70 linhas)
- ✏️ `src/pages/OrderDetailPage.tsx` (grid + remoção do Dialog + propagar `?foto=1` no botão de editar)
- ✏️ `src/pages/EditOrderPage.tsx` (ler query param + renderizar painel ao lado)
- ✏️ `src/pages/EditExtrasPage.tsx` (mesmo tratamento)
- ➖ `src/components/FotoPedidoDialog.tsx` (remover — substituído pelo SidePanel)

## Sem mudanças de banco / backend

Apenas frontend. Sem RPC, sem migração, sem novas libs.

## Memória

Sem necessidade de salvar memória nova — é uma evolução visual da feature de foto, sem impacto em regra de negócio.
