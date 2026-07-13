## Diagnóstico

Você já editou os preços corretos no banco — eu conferi:

| campo | nome | preco_adicional | relacionamento |
|---|---|---|---|
| solado | Couro Reta | **65** | cor_sola:[Madeira,Avermelhada,Pintada de Preto], cor_vira:[Neutra] |
| solado | Couro Carrapeta | **65** | idem |
| solado | Couro Carrapeta com Espaço Espora | **65** | idem |
| cor_sola | Off White | **10** | — |

Os dados estão salvos, com os relacionamentos preservados. O que falta é o **código** consultá-los: hoje `OrderPage.tsx` lê tudo das constantes `SOLADO`/`COR_SOLA` em `src/lib/orderFieldsConfig.ts` (Couro Reta ainda como 60, Off White como 0), ignorando o banco. Por isso salvar a nova versão da ficha não mudou nada — nem invalidar cache resolveria, o caminho nunca consulta o banco.

## Plano

**Objetivo:** o **preço** de Solado e Cor da Sola passa a vir do banco (`ficha_variacoes` slugs `solado` e `cor_sola`), sem tocar em pedidos antigos e sem desestruturar os relacionamentos que você já cadastrou.

### 1. Ler preço do banco em `OrderPage.tsx`
- Substituir `SOLADO.find(...).preco` → `findFichaPrice(solado, 'solado') ?? SOLADO.find(...)?.preco ?? 0` (linhas 1023, 1487).
- Substituir `getCorSolaOptions(...).find(...).preco` → `findFichaPrice(corSola, 'cor_sola') ?? getCorSolaPrecoContextual(...)` (linhas 1024-1025, 1488-1489).
- `orderFieldsConfig.ts` permanece intacto como fallback (para relacionamentos estruturais Modelo×Solado×Bico e para pedidos antigos com valores originais).

### 2. Registrar os slugs no lookup
- Em `src/hooks/useFichaVariacoesLookup.ts`, adicionar ao `CATEGORY_MAP`:
  ```
  'solado': 'solado',
  'cor_sola': 'cor_sola',
  'cor_vira': 'cor_vira',
  'formato_bico': 'formato_bico',
  ```
  Sem isso, `findFichaPrice('Couro Reta', 'solado')` retorna `undefined` mesmo com o dado no banco.

### 3. Refletir a mesma leitura em recompute/detalhe
- `src/lib/recomputeOrderPrice.ts` (linhas 105-107): usar `findFichaPrice` com fallback para `SOLADO`/`getCorSolaPrecoContextual`. O recompute já recebe o lookup — só faltam essas duas linhas.
- Isso mantém `OrderDetailPage`, `mirrorPriceItems` e ajuste retroativo consistentes com o formulário.

### 4. Cor da Vira também (mesma categoria de mudança, aproveito a passagem)
- Aplicar o mesmo padrão para `corVira` usando slug `cor_vira`, com fallback em `COR_VIRA` e `getCorViraOptions`. Isso deixa toda a seção "Solados" governada pelo banco.

### 5. NÃO mexer em (preservação):
- **Nenhum registro do banco** — não vou alterar `ficha_variacoes`, `relacionamento` (JSONB) nem versionamento. Os relacionamentos que você cadastrou continuam intocados.
- **Nenhum pedido existente** — pedidos salvos guardam apenas o label (`"Couro Reta"`, `"Off White"`) e o `preco` congelado no momento do save. Ler do banco só afeta cálculos novos; pedidos antigos continuam mostrando o valor original.
- **Estruturas de filtragem** (`getSoladosForModelo`, `getBicosForModeloSolado`, `getCorSolaOptions` restringindo por Modelo/Solado/Bico) continuam no código porque envolvem regras cruzadas Modelo↔Solado↔Bico que o banco não modela hoje. O que mudou é só a fonte do **valor monetário**.

### 6. Validação
- Rodar `tsgo` (typecheck).
- Abrir novo pedido: Bota Tradicional + Couro Reta + Off White (quando aplicável) — subtotal precisa somar 65 + 10.
- Abrir pedido antigo: valor histórico preservado (nada muda visualmente).
- Editar admin depois: `useAdminConfig` já invalida `ficha_variacoes_lookup`, então a mudança seguinte aparece sem reload.

## Nota técnica

Os slugs `solado`/`cor_sola`/`cor_vira`/`formato_bico` já existem em `ficha_campos` sob a categoria `solados-visual` e têm suas variações populadas com `relacionamento` JSONB. A mudança é puramente de leitura no frontend — nenhuma migração de schema, nenhuma alteração de dados.