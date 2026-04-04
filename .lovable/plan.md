
## Corrigir de vez o estoque de Gravata com brilho por cor

### Causa real do erro

O problema não está mais no campo da tela. A falha agora é no banco.

Pelos requests da aplicação, ao tentar salvar:

```text
cor_tira: Preto
tipo_metal: Bridão Estrela
cor_brilho: Azul
```

o Supabase retorna:

```text
duplicate key value violates unique constraint "gravata_stock_cor_tira_tipo_metal_key"
```

Ou seja:
- o frontend já envia `cor_brilho` corretamente
- a tabela `gravata_stock` ganhou a coluna `cor_brilho`
- mas a constraint única antiga ainda é só em `(cor_tira, tipo_metal)`

Então o banco considera:
- Preto + Bridão Estrela + Cristal
- Preto + Bridão Estrela + Azul

como se fossem a mesma variação.

### O que implementar

#### 1. Ajustar a tabela `gravata_stock`
Criar uma migration para:
- remover a unique constraint antiga de `(cor_tira, tipo_metal)`
- criar uma nova regra de unicidade que considere `cor_brilho`

A lógica correta é:

- para metais sem brilho: unicidade por `cor_tira + tipo_metal`
- para `Bridão Estrela` e `Bridão Flor`: unicidade por `cor_tira + tipo_metal + cor_brilho`

A forma mais segura é criar índice/constraint que trate `NULL` de modo consistente, por exemplo usando expressão com `coalesce(cor_brilho, '')`.

#### 2. Preservar compatibilidade com os dados atuais
Antes de criar a nova constraint, validar que os registros atuais continuam válidos.

Pelos dados atuais, eles já parecem compatíveis:
- existe `Bridão Estrela + Cristal`
- existe `Bridão Flor + Preto`
- existe `Bridão Flor + Azul`

Então a migration deve passar sem precisar apagar dados.

#### 3. Melhorar o `handleSaveStock` em `src/pages/ExtrasPage.tsx`
Hoje ele já tenta distinguir pela combinação completa, o que está certo.

Mas vale reforçar:
- manter `needsBrilho`
- manter `corBrilhoVal`
- continuar procurando item existente por `cor_tira + tipo_metal + cor_brilho`
- tratar erro de insert/update com toast mais claro caso o banco recuse

Isso evita que um erro futuro apareça como falha silenciosa.

#### 4. Revisar edição e listagem
A tela já exibe:
- `cor_tira`
- `tipo_metal`
- `cor_brilho` quando existe

Então não precisa mudar o layout principal.
Só confirmar que:
- editar quantidade continua por `id`
- excluir continua por `id`
- compra continua usando `selectedStockId`

Essas partes já parecem corretas.

### Arquivos envolvidos

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/...sql` | remover unique antiga e criar unique nova considerando `cor_brilho` |
| `src/pages/ExtrasPage.tsx` | manter lógica atual e melhorar tratamento de erro no salvar estoque |

### Detalhes técnicos

O ponto exato encontrado foi:

- migration inicial criou:
```sql
UNIQUE (cor_tira, tipo_metal)
```

- migration posterior só adicionou:
```sql
ALTER TABLE public.gravata_stock ADD COLUMN cor_brilho text DEFAULT NULL;
```

Então a modelagem ficou incompleta.

Fluxo esperado depois da correção:
```text
Preto + Bridão Estrela + Cristal  -> permitido
Preto + Bridão Estrela + Azul     -> permitido
Preto + Bridão Estrela + Rosa     -> permitido
Preto + Bridão Estrela + Azul     -> se repetir, soma quantidade no registro existente
```

### Resultado esperado

Depois da correção:
- será possível cadastrar `Bridão Estrela` com qualquer cor de strass
- cada cor ficará como uma variação separada no estoque
- o erro 409 de duplicidade deixará de acontecer nesse cenário
- o fluxo de compra continuará abatendo o item correto pelo `id`

