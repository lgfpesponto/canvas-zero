

## Extras embutidos dentro de cada bota no pedido Bota Pronta Entrega

### Conceito

Cada bota no formulário de Bota Pronta Entrega ganha um botão "+ Extra" que permite adicionar extras (Adicionar Metais, Carimbo a Fogo, Kit Faca, Kit Canivete, Tiras Laterais) dentro daquela bota. Os campos de preenchimento do extra aparecem inline (sem campos de Nº pedido, cliente, etc., pois herdam da bota). O valor do extra soma ao valor da bota, e no final aparece "Valor total da bota" = valor manual + extras. O pedido final soma tudo.

### Estrutura de dados

Cada item em `botasPE` passa a ter um array `extras`:

```typescript
interface BotaPEItem {
  descricao: string;
  valor: string;        // valor manual da bota
  quantidade: string;   // fixo '1'
  extras: BotaPEExtra[]; // extras embutidos
}

interface BotaPEExtra {
  tipo: string;  // 'adicionar_metais' | 'carimbo_fogo' | 'kit_faca' | 'kit_canivete' | 'tiras_laterais'
  dados: Record<string, any>; // campos do extra (mesmos do form principal)
  preco: number; // calculado automaticamente
}
```

Salvamento em `extraDetalhes.botas[i]`:
```json
{
  "descricaoProduto": "Bota X tam 38",
  "valorManual": "350",
  "quantidade": "1",
  "extras": [
    { "tipo": "carimbo_fogo", "dados": { "qtdCarimbos": "2", "descCarimbos": "...", "ondeAplicado": "..." }, "preco": 20 },
    { "tipo": "tiras_laterais", "dados": { "corTiras": "Marrom" }, "preco": 15 }
  ]
}
```

O campo `valorManual` continua sendo o valor manual da bota. O valor total da bota = `valorManual + soma dos extras.preco`.

### Alteracoes

**1. `src/pages/ExtrasPage.tsx`**

- Atualizar tipo de `botasPE` para incluir `extras: []`
- No bloco de cada bota (linhas 588-633), apos o campo quantidade, adicionar:
  - Botao "+ Extra" que abre um dropdown/select com as 5 opcoes
  - Ao selecionar, adiciona um item ao `bota.extras[]` e renderiza os campos daquele tipo inline (reutilizando a mesma logica de campos ja existente: corTiras, qtdCarimbos, metaisSelecionados, etc.)
  - Cada extra exibe seu preco calculado e um botao X para remover
- Apos o campo "Valor da bota", exibir "Valor total da bota X: R$ {valorManual + soma extras}" 
- `calcPrice`: somar extras de todas as botas ao total
- `handleSubmit`: salvar `extras` dentro de cada bota no `detalhes.botas[i]`
- Funcao helper `calcExtraPrice(tipo, dados)` para calcular preco de cada extra embutido (mesma logica do `calcPrice` existente)

**2. `src/pages/EditExtrasPage.tsx`**

- Carregar `extras` de cada bota ao inicializar
- Mesma UI de "+ Extra" dentro de cada bota
- Salvar extras na edicao

**3. `src/pages/OrderDetailPage.tsx`**

- No bloco de exibicao de cada bota (linhas 389-404), listar os extras embutidos com tipo, detalhes e preco

**4. `src/components/SpecializedReports.tsx`**

- Em `buildCompositionItems` e `generateCobrancaPDF`: ao iterar `det.botas`, incluir os extras de cada bota como sub-itens na composicao
- Ex: "Bota 1: Bota X tam 38 — R$ 350" + "  ↳ Carimbo a Fogo — R$ 20"

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/ExtrasPage.tsx` | Estado extras por bota, UI "+ Extra", calculo, submit |
| `src/pages/EditExtrasPage.tsx` | Carregar e editar extras embutidos |
| `src/pages/OrderDetailPage.tsx` | Exibir extras de cada bota na visualizacao |
| `src/components/SpecializedReports.tsx` | PDFs listam extras de cada bota na composicao |

