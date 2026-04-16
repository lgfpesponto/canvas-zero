

## Diagnóstico: Preços de couro embutidos no código, não visíveis no admin

### Situação atual

Os preços dos tipos de couro estão **hardcoded** no arquivo `src/lib/orderFieldsConfig.ts` no objeto `COURO_PRECOS`:

```text
Estilizado em Dinossauro  → R$ 50
Estilizado em Avestruz    → R$ 10
Estilizado em Tatu        → R$ 40
Aramado                   → R$ 40
Escamado                  → R$ 20
Estilizado Duplo          → R$ 20
Vaca Holandesa            → R$ 15
Vaca Pintada              → R$ 15
```

No banco de dados (`ficha_variacoes`), os campos `couro_cano`, `couro_gaspea` e `couro_taloneira` existem mas **todas as variações estão com `preco_adicional = 0`**. O formulário de pedido (`OrderPage.tsx`) usa `COURO_PRECOS[t]` diretamente — nunca consulta `ficha_variacoes` para couros.

Ou seja: diferente de bordados e laser (que já usam a cascata `ficha_variacoes → custom_options → fallback`), os couros **pulam** essa cascata e vão direto no hardcoded.

### Plano de correção

#### 1. Atualizar preços no banco de dados
Executar UPDATE nos registros de `ficha_variacoes` para os campos `couro_cano`, `couro_gaspea` e `couro_taloneira`, preenchendo o `preco_adicional` com os valores do `COURO_PRECOS` hardcoded. As 3 partes (cano, gáspea, taloneira) compartilham os mesmos tipos de couro, então os mesmos preços se aplicam.

#### 2. Integrar couros na cascata de preços
Adicionar `couro_cano`, `couro_gaspea` e `couro_taloneira` ao `CATEGORY_MAP` em `useFichaVariacoesLookup.ts`, permitindo que `findFichaPrice` funcione para couros.

#### 3. Alterar cálculo de preço no formulário
Em `OrderPage.tsx`, `EditOrderPage.tsx` e `OrderDetailPage.tsx`, substituir `COURO_PRECOS[t]` pela cascata `findFichaPrice(t, 'couro_cano') ?? COURO_PRECOS[t] ?? 0` — mantendo o fallback hardcoded como segurança.

### O que NÃO muda
- Os valores finais dos pedidos existentes (preços já salvos no banco)
- A lista de tipos de couro disponíveis (continua vindo de `TIPOS_COURO`)
- A lógica de cores por tipo de couro
- O `COURO_PRECOS` permanece como fallback de segurança

### Resultado
Depois da mudança, ao alterar o preço de um couro na página de configurações, o novo valor será usado automaticamente no "Faça seu pedido". Os preços ficarão visíveis e editáveis no admin.

