## Ajustes no Portal Bordado

### 1. Botão de "voltar para entrada" nos cards da coluna Baixa
No `BordadoColumn`, espelhar o padrão do botão verde de baixa-rápida, mas para a coluna **Baixa Bordado 7Estrivos**:
- Ícone `RotateCcw` (rodinha de voltar) dentro de um botão circular âmbar (mesma cor da coluna Entrada).
- Tooltip: "Voltar para Entrada Bordado 7Estrivos".
- Ao clicar, chama `aplicarStatus(o.id, 'Entrada Bordado 7Estrivos')` (mesmo RPC `bordado_baixar_pedido` já usado), com atualização otimista movendo o card de Baixa → Entrada.
- Reaproveitar o estado `quickBaixaIds` (renomear conceitualmente para "loading rápido" via segundo prop) — adicionar nova prop `showQuickEntrada` + handler `onQuickEntrada` no `BordadoColumn`.

### 2. Cores dos botões de scan alinhadas às colunas
- "ESCANEAR PARA DAR ENTRADA" passa a usar **âmbar** (`bg-amber-500 hover:bg-amber-600`, texto branco) — igual ao bloco "Entrada Bordado 7Estrivos".
- "ESCANEAR PARA DAR BAIXA" passa a usar **emerald** (`bg-emerald-600 hover:bg-emerald-700`) — igual ao bloco "Baixa Bordado 7Estrivos".
- Modal scanner (`scannerMode === 'entrada'`) muda accent de `sky` para `amber`: borda do modal, ícones, banner de progresso, botão de submit, foco do input.
- `scannerMode === 'baixa'` permanece emerald.

### 3. Reformulação completa do PDF "Resumo de baixas" (comissão do bordado)

**Regras de comissão**:
- Bota (tipo_extra IS NULL): **R$ 1,00 / par**.
- Cinto (tipo_extra = 'cinto'): **R$ 0,50 / unidade**.
- Outros extras: ignorados no resumo.
- Considerar somente baixas em **dias úteis (seg–sex)** com base na **data da baixa**. Sábado/domingo são filtrados fora.

**Layout do PDF (A4 retrato)**:

```text
┌──────────────────────────────────────────────────────────────┐
│ Resumo Comissão Bordado 7Estrivos          Período / Página  │
├──────────────────────────────────────────────────────────────┤
│ Total geral: X itens • R$ Y,YY     Gerado por: <nome>        │
│                                                              │
│ ── Baixa: 02/05/2026 (sex) ──────────────────────────────── │
│ Qtd | Nº Pedido (cód.barras) | Tipo  | Comissão | Entrada    │
│  1  | 30040  (177421...)     | Bota  | R$ 1,00  | 30/04/2026 │
│  1  | 60358  (...)           | Cinto | R$ 0,50  | 01/05/2026 │
│ Subtotal do dia: 2 itens • R$ 1,50                           │
│                                                              │
│ ── Baixa: 03/05/2026 (sáb) — IGNORADO (fim de semana) ───── │
│                                                              │
│ ── Totais ──                                                 │
│ Botas:   N pares  • R$ N,00                                  │
│ Cintos:  M unid.  • R$ M,50                                  │
│ TOTAL:   X itens  • R$ Y,YY                                  │
└──────────────────────────────────────────────────────────────┘
```

**Colunas da tabela** (cabeçalho cinza repetido em cada quebra de página):
1. **Qtd** — sempre 1 por linha; total acumulado no rodapé do dia e geral.
2. **Nº Pedido** — número grande em negrito + código de barras (UUID hex 12 caracteres) em cinza menor abaixo.
3. **Tipo** — "Bota" ou "Cinto".
4. **Valor comissão** — R$ formatado.
5. **Data entrada bordado** — extraída do histórico (primeira entrada `local === 'Entrada Bordado 7Estrivos'`).
6. **Data baixa bordado** — exibida como **cabeçalho de grupo** (não coluna), pois agrupamos por dia.

**Construção das linhas**:
- Para cada pedido: pegar do `historico` a primeira entrada `Entrada Bordado` (data) e a baixa dentro do período (`Baixa Bordado 7Estrivos`).
- Filtrar: dia da semana da baixa entre 1 e 5 (seg-sex). Sábado/domingo descartados (sem comissão).
- Agrupar linhas por data de baixa, ordenado cronologicamente.

**Correção do espaçamento**: cada linha terá altura `7mm` (atualmente 5.5mm é colado). Texto base `9pt`, código de barras `7pt`. `y += 8` mínimo entre linhas; quebra de página em `y > 275`. Linha separadora `setDrawColor(230)` posicionada em `y - 2` para não tocar o texto.

**Rodapés**:
- Subtotal por dia logo após o último item daquele dia (negrito, fundo bem claro).
- Bloco final "Totais" com:
  - Botas: pares + valor.
  - Cintos: unidades + valor.
  - Total geral: itens + valor.
- Listar explicitamente as datas de baixa cobertas (uma linha: "Datas de baixa: 02/05, 05/05, 06/05...").

**Nome do arquivo**: `Comissao-Bordado-{de}_a_{ate}.pdf`.

### Detalhes técnicos
- Arquivos: `src/pages/BordadoPortalPage.tsx`, `src/lib/pdfGenerators.ts`.
- Em `BordadoPortalPage.tsx`:
  - Adicionar import `RotateCcw` de `lucide-react`.
  - Novo handler `handleQuickEntrada` análogo a `handleQuickBaixa`.
  - Compartilhar `quickBaixaIds` para ambos botões (loading visual).
  - Trocar classes Tailwind dos botões e do modal conforme item 2.
- Em `pdfGenerators.ts`:
  - Reescrever `generateBordadoBaixaResumoPDF` mantendo a assinatura atual.
  - Helper local: `comissaoFor(o)` retorna `{ tipo: 'Bota'|'Cinto'|null, valor: number }`.
  - Helper local: `isDiaUtil(yyyyMmDd)` — `new Date(y,m-1,d).getDay()` ∈ [1..5].
  - Reusar `formatDateBR`, `stampPageNumbers`.
  - Para o código de barras: usar últimos 12 hex do `id` (mesma lógica de `orderBarcodeValueLegacy`/UUID suffix). Não precisa renderizar barras gráficas, só o texto do código abaixo do número.
- Sem alterações em RPCs, Supabase ou demais telas.
