## Reorganizar header do Detalhe do Pedido — Conferido + Ver foto

### Mudanças no `src/pages/OrderDetailPage.tsx`

#### 1. Célula 1 — Número do pedido (linha 1, esquerda)
Remover o botão "Ver foto" daqui. Fica apenas o rótulo "NÚMERO DO PEDIDO" + número, sem aperto.

#### 2. Célula 4 — antes "Conferido" (linha 2, direita)
Substituir o bloco do Conferido por **Ver foto / Ver fotos (N)**:
- Rótulo `FOTO` (mesmo estilo uppercase muted das outras células).
- À direita, o botão `Ver foto` / `Ver fotos (N)` com `ImageIcon`, mesmo handler `setFotoOpen(true)`.
- Se não houver foto: mostra "—" em muted (ou esconde a célula com `<div className="hidden sm:block" />` para preservar o grid). Vou usar o placeholder vazio para manter o alinhamento de Data/Hora à esquerda.

#### 3. Bloco "Composição do Pedido" — título com Conferido à direita
Transformar o `<h2>` (linha 728) em um flex:

```text
[ Composição do Pedido           [☐ ⊙ Conferido]  ou  [☑ ⊙ Conferido em 02/05/2026, 16:25] ]
```

Recriar o pill no estilo das imagens enviadas (image-38 / image-39):
- Container: `inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border/60`
- `<Checkbox>` (mesma lógica de update já existente — `conferido`, `conferido_em`, `conferido_por`)
- `<CheckCircle2 size={14}>` colorido por estado (primary quando marcado, muted quando não)
- `<span className="font-bold">Conferido</span>`
- Quando marcado e tem `conferidoEm`: `<span className="text-xs text-muted-foreground font-normal">em {data formatada}</span>`
- Quando não marcado: `<span className="text-sm">Não</span>` à direita do label (igual à image-38)

Visibilidade: continua restrita a `role === 'admin_master'` (regra atual mantida). Para outros papéis, o título fica sozinho, alinhado à esquerda.

### Layout final do header

```text
┌──────────────────────────────────────────────────────────────┐
│ NÚMERO DO PEDIDO    23719       │ VENDEDOR        Rafael Silva │
│ DATA E HORA   30/04/2026 — 00:01│ FOTO         [🖼 Ver foto]   │
│ ⏱ PRAZO 5 DIAS ÚTEIS                       5 dias úteis rest. │
├──────────────────────────────────────────────────────────────┤
│ Composição do Pedido                  [☑ ⊙ Conferido em ...] │
│ ...                                                            │
└──────────────────────────────────────────────────────────────┘
```

### Fora de escopo
- Lógica de salvar Conferido (mantida idêntica)
- Composição, subtotal/total, edição de valor, lápis do Bloco 2, prazo, demais blocos
- Permissões (admin_master continua sendo o único que vê o Conferido)
