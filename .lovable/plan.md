

## Layout compacto dos blocos nos PDFs de produção

### O que muda

Na imagem de referência, o layout de cada bloco é mais compacto:

```text
┌──────┐
│ SOLA │  Sola borracha bico quadrado cor marrom vira rosa
└──────┘
   TAMANHO    │ 34 │ 35 │ 38 │ 40 │
   QUANTIDADE │  3 │  2 │  1 │  4 │
```

- O **título** tem um badge preto à esquerda ("SOLA") seguido do texto descritivo na mesma linha
- **TAMANHO** é um label à esquerda, com as caixas dos valores à direita na mesma linha
- **QUANTIDADE** é um label à esquerda, com as caixas dos valores à direita na mesma linha
- Tudo numa estrutura horizontal compacta (menos espaço vertical)

### Alterações

**Arquivo**: `src/components/SpecializedReports.tsx`

#### 1. Criar função helper `drawBlockLayout`
Função reutilizável que desenha um bloco no formato compacto:
- **Linha 1**: Badge preto com label (ex: "SOLA") + texto descritivo ao lado
- **Linha 2**: Label "TAMANHO" à esquerda (bold) + caixas pretas com texto branco para cada tamanho
- **Linha 3**: Label "QUANTIDADE" à esquerda (bold) + caixas pretas com texto branco para cada quantidade
- Retorna o novo Y para o próximo bloco
- Altura estimada por bloco: ~22mm (título 8mm + tamanho 7mm + quantidade 7mm)

#### 2. Refatorar `generateEscalacaoPDF`
- **Agrupamento**: Mudar de `tamanho|solado|formatoBico|corSola` para `solado|formatoBico|corSola|corVira` (tamanho vira sub-agrupamento dentro do bloco)
- **Título do bloco**: Badge "SOLA" + `{solado} bico {formatoBico} cor {corSola} vira {corVira}`
- Dentro do bloco: linhas TAMANHO e QUANTIDADE com caixas lado a lado
- Adicionar filtro de progresso (remover hardcode "Pespontando")
- **Título do PDF**: `ESCALAÇÃO — {progresso} — dd/mm/aaaa`
- **Nome do arquivo**: `Escalação - {progresso} - dd-mm-aaaa.pdf`

#### 3. Refatorar `generateForroPDF`
- **Agrupamento**: Mudar para `modelo|forma` (tamanho vira sub-agrupamento)
- **Título do bloco**: Badge "MODELO" + `{modelo} — Forma {forma}`
- Dentro do bloco: linhas TAMANHO e QUANTIDADE
- **Título e nome de arquivo**: `FORRO — {progresso} — dd/mm/aaaa`

#### 4. Adicionar relatório Palmilha
- Adicionar `'palmilha'` ao tipo `ReportType` e `REPORT_LABELS`
- Mesmo layout e agrupamento do Forro (modelo/forma com tamanhos)
- **Título**: `PALMILHA — {progresso} — dd/mm/aaaa`

#### 5. Atualizar Pesponto para novo layout de blocos
- Mesmo padrão visual de blocos por modelo/forma

#### 6. Atualizar UI de filtros
- `needsProgressFilter` incluirá `'escalacao'` e `'palmilha'`
- Importar `getForma` de `orderFieldsConfig`

### Detalhes técnicos do helper

```typescript
interface BlockData {
  badgeLabel: string;    // ex: "SOLA"
  description: string;   // ex: "borracha bico quadrado cor marrom vira rosa"
  sizes: { tamanho: string; quantidade: number }[]; // ordenados crescente
}

function drawBlockLayout(doc: jsPDF, y: number, mx: number, block: BlockData): number
```

O helper desenha:
1. Retângulo preto com texto branco para o badge, texto normal para a descrição (mesma linha)
2. "TAMANHO" bold à esquerda (~30mm), seguido de caixas pretas (12mm cada) com texto branco centralizado
3. "QUANTIDADE" bold à esquerda (~30mm), seguido de caixas pretas com texto branco centralizado
4. Retorna `y + ~24` (com margin)

