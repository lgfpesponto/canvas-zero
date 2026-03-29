

## Alterações na Ficha de Produção "Bota"

### 1. Nova cor "Chocolate" nos couros (`orderFieldsConfig.ts`)
- Adicionar `'Chocolate'` ao array `CORES_COURO`

### 2. Desativar Cor Borrachinha e Cor Vivo para modelos específicos (`OrderPage.tsx`)
- Criar constante: `const HIDE_PESPONTO_EXTRAS = ['Botina', 'Botina Infantil', 'Destroyer', 'Coturno']`
- Na seção Pesponto (linha 755-761): renderizar Cor da Borrachinha e Cor do Vivo condicionalmente — ocultar quando `HIDE_PESPONTO_EXTRAS.includes(modelo)`
- Remover `corBorrachinha` e `corVivo` da validação obrigatória (linhas 402-403) quando modelo está na lista
- Limpar valores ao trocar modelo em `handleModeloChange` se novo modelo estiver na lista

### 3. Novo metal "Cavalo" (R$5/un) (`OrderPage.tsx`)
- Adicionar constante `CAVALO_METAL_PRECO = 5` em `orderFieldsConfig.ts`
- Novos states: `cavaloMetal` (boolean), `cavaloMetalQtd` (number)
- Na seção Metais (após Bridão, linha 795): adicionar ToggleField "Cavalo (R$5/un)" com campo quantidade
- Preço: `cavaloMetal ? cavaloMetalQtd * 5 : 0` — somar ao total
- Incluir no `confirmOrder`, `handleSaveDraft`, `mirrorRows` e restauração de draft/template

### 4. Novo extra "Franja" (R$15) (`OrderPage.tsx`)
- Adicionar constante `FRANJA_PRECO = 15` em `orderFieldsConfig.ts`
- Novos states: `franja` (boolean), `franjaCouro` (string), `franjaCor` (string)
- Na seção Extras (após Tiras, linha 802): ToggleField "Franja (+R$15)" — quando ativo, mostrar 2 inputs: "Tipo de couro da franja" e "Cor da franja"
- Somar R$15 ao total quando ativo
- Incluir no `confirmOrder`, `handleSaveDraft`, `mirrorRows`

### 5. Novo extra "Corrente" (R$10) (`OrderPage.tsx`)
- Adicionar constante `CORRENTE_PRECO = 10` em `orderFieldsConfig.ts`
- Novos states: `corrente` (boolean), `correnteCor` (string)
- Na seção Extras (após Franja): ToggleField "Corrente (+R$10)" — quando ativo, mostrar input "Cor da corrente"
- Somar R$10 ao total
- Incluir no `confirmOrder`, `handleSaveDraft`, `mirrorRows`

### 6. "Cor do bordado" abaixo de cada Glitter/Tecido na seção Laser (`OrderPage.tsx`)
- Novos states: `corBordadoLaserCano`, `corBordadoLaserGaspea`, `corBordadoLaserTaloneira`
- Após cada "Cor Glitter/Tecido do X" (linhas 730, 736, 742): adicionar input texto "Cor do Bordado"
- Campos informativos, sem valor
- Incluir no `confirmOrder`, `handleSaveDraft`, `mirrorRows`

### 7. Novo modelo "Cano Inteiro" R$260 (`orderFieldsConfig.ts`)
- Adicionar `{ label: 'Cano Inteiro', preco: 260 }` ao array `MODELOS`
- Em `getModelosForTamanho`: adicionar `'Cano Inteiro'` na faixa 34-45
- Adicionar `'Cano Inteiro'` ao array `TRADICIONAL_MODELOS` (mesmo bloco que Bota Tradicional) — herda solados do bloco `tradicional` (Borracha, Couro Reta, etc.) e bicos (Quadrado, Redondo), o que exclui automaticamente Infantil, PVC, Borracha City e os bicos finos

### 8. Persistência dos novos campos
- `confirmOrder`: adicionar `cavaloMetalQtd`, `franja`, `franjaCouro`, `franjaCor`, `corrente`, `correnteCor`, `corBordadoLaserCano/Gaspea/Taloneira` ao payload via campo `observacao` ou `adicionalDesc` (ou campos dedicados se existirem na tabela)
- Como não existem colunas dedicadas no banco, os novos dados serão armazenados no campo `observacao` como texto estruturado, ou no `adicionalDesc`/`adicionalValor`. Alternativa: usar colunas existentes e adicionar migração se necessário.

Verificação: os campos `observacao` (text) já existe. Melhor abordagem: armazenar os novos dados como parte do JSON em `extra_detalhes` (jsonb) ou criar novas colunas. Vou usar `extra_detalhes` para os novos campos da ficha de bota, já que é jsonb e flexível.

### Resumo de arquivos alterados

| Arquivo | Alterações |
|---------|-----------|
| `src/lib/orderFieldsConfig.ts` | Chocolate em CORES_COURO, Cano Inteiro em MODELOS/TRADICIONAL_MODELOS/getModelosForTamanho, constantes CAVALO/FRANJA/CORRENTE |
| `src/pages/OrderPage.tsx` | 6 novos states, seção Pesponto condicional, Cavalo em Metais, Franja+Corrente em Extras, Cor bordado em Laser, draft/template/mirror/confirmOrder |

