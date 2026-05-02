## Objetivo

Reorganizar `/pedido/:id` em **3 blocos visuais separados**, com Detalhes da Bota no estilo da ficha impressa e históricos colapsáveis. Manter o comportamento atual do botão "Ver foto" (abre painel lateral).

## Estrutura final

```text
┌─────────────────────────────────────────┐
│ BLOCO 1 — Informações Base              │
│  • Cabeçalho (nº, vendedor, "Ver foto", │
│    valor)                               │
│  • Data, prazo, "Conferido"             │
│  • Composição do Pedido (itens + total) │
│  • Edição de Valor (admin_master)       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ BLOCO 2 — Detalhes (estilo Ficha)       │
│  • Categorias com faixa primary         │
│  • Sem canhotos                         │
│  • Link da foto (no lugar do QR)        │
│  • Observação                           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ BLOCO 3 — Históricos (ordem fixa)       │
│   1. Produção                           │
│   2. Alterações                         │
│   3. Impressão                          │
│  Cada um:                               │
│   • Mostra somente a entrada mais recente│
│   • Botão "Ver mais (N)" / "Ver menos"  │
│   • Mais antiga sempre por último       │
└─────────────────────────────────────────┘
```

## Comportamento do "Ver foto" (mantém o atual)

- O botão "Ver foto/Ver fotos (N)" no cabeçalho do Bloco 1 continua chamando `setFotoOpen(true)`.
- Painel lateral `FotoPedidoSidePanel` segue aparecendo à direita (grid `lg:grid-cols-[minmax(0,1fr)_400px]`), exatamente como hoje.
- O link de foto adicionado no Bloco 2 (substituindo o QR da ficha) é **apenas um link clicável** (URL → abre em nova aba). Não substitui o botão "Ver foto" do cabeçalho.

## Alterações por bloco

### Bloco 1 — Card "Informações Base"
Envolver em um único card (`bg-card rounded-xl p-6 md:p-8 western-shadow`):
- Cabeçalho atual (nº pedido, ícone editar, vendedor, botão **Ver foto**, valor à direita) — **inalterado**.
- Data + prazo + "Conferido" — inalterado.
- "Composição do Pedido" + "Edição de Valor" — inalterados em lógica.

### Bloco 2 — Card "Detalhes da Bota" estilo ficha
Card separado, abaixo do Bloco 1:
- Título `Detalhes da Bota` (ou `Detalhes — {extra}`).
- Categorias em faixa `bg-primary text-primary-foreground` (já existe), grid 2 colunas (já existe).
- Sem canhotos (página já não tem).
- Para extras/cinto: manter sub-layouts atuais (multi-bota, cinto agrupado).
- **No final do card**, área "Foto de Referência":
  - Se `fotosValidas.length > 0`: lista de links clicáveis (`<a target="_blank">`) com a URL da(s) foto(s).
  - Senão: "Sem foto de referência."
- "Observação" entra dentro deste card (abaixo das categorias, antes da Foto de Referência).
- Remover o bloco "Foto de Referência" antigo (linhas 1041-1056) — sua função visual passa a ser cumprida aqui.

### Bloco 3 — Card "Históricos" colapsáveis
Card separado, ordem fixa:
1. **Histórico de Produção** (`order.historico` invertido)
2. **Histórico de Alterações** (`alteracoesAgrupadas` invertido)
3. **Histórico de Impressão** (`order.impressoes` invertido — já é hoje)

Comportamento por seção:
- Renderizar do mais recente → mais antigo.
- Estado inicial: mostra **apenas a 1ª entrada** (mais recente).
- Se `items.length > 1`: botão "Ver mais (N anteriores)" expande o restante; quando expandido vira "Ver menos".
- Se `items.length === 0`: mensagem de vazio existente.
- Se `items.length === 1`: nenhum botão.

## Detalhes técnicos

**Arquivo único:** `src/pages/OrderDetailPage.tsx`

1. **Wrapper externo** dos 3 cards: `<div className="space-y-6">…</div>` substituindo o `bg-card` único atual.

2. **Componente local `CollapsibleHistory`** (definido no mesmo arquivo, sem novos imports):
   - Props: `title: string`, `icon?: ReactNode`, `items: T[]`, `renderItem: (item: T, idx: number) => ReactNode`, `emptyMessage: string`.
   - `useState` interno para `expanded`.
   - Usa `Button` (`variant="ghost" size="sm"`) já importado.

3. **Inversão das listas**:
   - `const historicoDesc = [...order.historico].reverse();`
   - `const alteracoesDesc = [...alteracoesAgrupadas].reverse();`
   - `const impressoesDesc = [...(order.impressoes || [])].reverse();`

4. **Foto no Bloco 2**:
   ```tsx
   const fotosValidas = (order.fotos || []).filter(f => isHttpUrl(f));
   <div className="mt-4 pt-3 border-t border-border">
     <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
       Foto de Referência
     </p>
     {fotosValidas.length === 0 ? (
       <p className="text-xs text-muted-foreground">Sem foto de referência.</p>
     ) : (
       fotosValidas.map((url, i) => (
         <a key={i} href={url} target="_blank" rel="noopener noreferrer"
            className="text-sm text-primary hover:underline break-all block">
           {url} ↗
         </a>
       ))
     )}
   </div>
   ```

5. **Não mexer**: lógica de cálculo, scanner, edição de valor, "Conferido", navegação entre pedidos, painel lateral `FotoPedidoSidePanel` (continua acionado pelo botão "Ver foto" do cabeçalho).

## Fora do escopo

- Sem mudanças em DB, edge functions, PDFs ou outros componentes.
- Sem alteração de regras de negócio.

## Resultado esperado

Página de detalhe dividida em 3 cartões claros, com o card central espelhando a ficha impressa (link no lugar do QR), históricos enxutos por padrão e o botão "Ver foto" continuando a abrir a foto no painel lateral como já funciona hoje.
