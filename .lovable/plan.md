## Objetivo

Permitir que **todos os extras** (qualquer `tipoExtra`, incluindo `cinto`) sigam pelo caminho de **Baixa Site (Despachado)** após Expedição, em vez de ir direto para Entregue. Hoje só botas normais têm essa opção.

## Mudança no fluxo

**Extras puros** (`EXTRAS_FLOW` em `src/lib/statusTransitions.ts`):
- Hoje: `Expedição → Entregue`
- Novo: `Expedição → Baixa Site (Despachado)` → `Entregue → Conferido → Cobrado → Pago`
- Adicionar entrada nova `'Baixa Site (Despachado)': ['Entregue']`

**Cinto** (`BELT_FLOW`):
- Hoje em Expedição já existe `Baixa Site (Despachado)` e `Baixa Estoque` como destinos, **mas** o filtro `applyContextFilter` esconde "Baixa Site" quando `vendedor === 'Estoque'` e esconde "Baixa Estoque" caso contrário — esse comportamento será mantido (igual bota).
- Não precisa alterar o BELT_FLOW em si, só confirmar que continua funcionando.

**Botas pronta entrega** caem na regra de extras (tipoExtra = `bota_pronta_entrega`), então a mudança em EXTRAS_FLOW já cobre.

## Detalhes técnicos

Arquivo único: `src/lib/statusTransitions.ts`

```text
EXTRAS_FLOW = {
  'Em aberto': ['Produzindo', 'Expedição'],
  'Produzindo': ['Em aberto', 'Expedição'],
  'Expedição': ['Baixa Site (Despachado)', 'Baixa Estoque'],   // antes: ['Entregue']
  'Baixa Site (Despachado)': ['Entregue'],                      // NOVO
  'Baixa Estoque': ['Entregue'],                                // NOVO (cobre vendedor Estoque)
  'Entregue': ['Conferido'],
  'Conferido': ['Cobrado'],
  'Cobrado': ['Pago'],
  'Pago': [],
}
```

O `applyContextFilter` já garante que:
- "Baixa Estoque" só aparece quando `vendedor === 'Estoque'`
- "Baixa Site (Despachado)" só aparece quando `vendedor !== 'Estoque'`

Logo um extra do `Estoque` vai por `Expedição → Baixa Estoque → Entregue`, e qualquer extra de revendedor/Rancho Chique vai por `Expedição → Baixa Site (Despachado) → Entregue`.

## Fora de escopo

- Sem mudança em PDFs, relatórios, comissão ou regras financeiras.
- Sem mudança no fluxo de bota normal nem no BELT_FLOW.
- Sem migração de banco — só lógica frontend de transições.
