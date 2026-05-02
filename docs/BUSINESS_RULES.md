# Regras de Negócio — Sistema 7 Estrivos

> **Última atualização**: 2026-04-10
> Este documento reflete fielmente as regras implementadas no código-fonte. Qualquer alteração no sistema deve ser refletida aqui.

---

## A. Modelos e Preços

| Modelo | Preço |
|--------|-------|
| Bota Tradicional | R$260 |
| Bota Feminino | R$260 |
| Bota Peão | R$260 |
| Bota Montaria (40) | R$270 |
| Coturno | R$240 |
| Destroyer | R$200 |
| Capota | R$230 |
| Capota Bico Fino | R$230 |
| Capota Bico Fino Perfilado | R$230 |
| Cano Médio | R$205 |
| Botina | R$200 |
| Bota Infantil | R$170 |
| Botina Infantil | R$160 |
| Bota Over | R$270 |
| Urbano | R$260 |
| Bota Bico Fino Feminino | R$260 |
| Bota Bico Fino Perfilado | R$260 |
| Tradicional Bico Fino | R$260 |
| Cano Médio Infantil | R$160 |
| City | R$270 |
| Cano Inteiro | R$260 |

**Fonte**: `MODELOS` em `src/lib/orderFieldsConfig.ts`

---

## B. Vinculação Tamanho → Modelo

| Faixa | Modelos disponíveis |
|-------|---------------------|
| 24–33 | Bota Infantil, Botina Infantil, Cano Médio Infantil |
| 34–45 | Bota Tradicional, Bota Feminino, Bota Peão, Coturno, Destroyer, Capota, Bota Over, Capota Bico Fino Perfilado, Cano Médio, Botina, Urbano, Bota Bico Fino Perfilado, Tradicional Bico Fino, Cano Inteiro |
| 34–40 | Bota Montaria (40) *(só até 40)* |
| 33–40 | Bota Bico Fino Feminino, Capota Bico Fino |
| 34–40 | City |

**Fonte**: `getModelosForTamanho()` em `src/lib/orderFieldsConfig.ts`

---

## C. Blocos de Modelo → Solado → Bico → Cor Sola → Cor Vira → Forma

O sistema define **5 blocos** que controlam toda a cadeia de dependências entre campos:

### Bloco INFANTIL
**Modelos**: Bota Infantil, Botina Infantil, Cano Médio Infantil

| Campo | Valor |
|-------|-------|
| Solado | Infantil (R$0) |
| Bico | Quadrado |
| Cor Sola | *(campo oculto — retorna null)* |
| Cor Vira | Bege (R$0) |
| Forma | 1652 |

### Bloco CITY
**Modelos**: City

| Campo | Valor |
|-------|-------|
| Solado | Borracha City (R$0) |
| Bico | Fino Ponta Redonda |
| Cor Sola | Preto (R$0) |
| Cor Vira | Neutra (R$0) |
| Forma | 13446 |

### Bloco TRADICIONAL
**Modelos**: Bota Tradicional, Bota Feminino, Bota Peão, Bota Montaria (40), Coturno, Destroyer, Capota, Cano Médio, Botina, Urbano, Cano Inteiro

| Campo | Regras |
|-------|--------|
| **Solados** | Borracha (R$0), Couro Reta (R$60), Couro Carrapeta (R$60), Couro Carrapeta com Espaço Espora (R$60), Jump (R$30), Rústica (R$0) |
| *Se bico = Redondo* | *Remove Jump e Rústica da lista* |
| **Bico** | Quadrado, Redondo |
| **Cor Sola (Borracha)** | Marrom (R$20), Preto (R$0), Branco (R$20) |
| *Borracha + bico Redondo* | *Apenas Preto (R$0) e Branco (R$20)* |
| **Cor Sola (Couro Reta / Carrapeta / Carrapeta c/ Espaço)** | Madeira (R$0), Avermelhada (R$10), Pintada de Preto (R$0) |
| **Cor Sola (Jump)** | *(campo oculto — retorna null)* |
| **Cor Sola (Rústica)** | Madeira (R$0) |
| **Cor Vira (Borracha)** | Bege (R$0), Rosa (R$10), Preto (R$10) |
| **Cor Vira (demais solados)** | Neutra (R$0) |
| **Forma (bico Quadrado)** | 2300 |
| **Forma (bico Redondo)** | 7576 |

### Bloco BICO FINO FEMININO
**Modelos**: Bota Bico Fino Feminino, Capota Bico Fino

| Campo | Regras |
|-------|--------|
| **Solados** | PVC (R$0), Couro Reta (R$60) |
| **Bico** | Fino Ponta Redonda |
| **Cor Sola (PVC)** | Preto (R$0), Off White (R$0), Marrom (R$0) |
| **Cor Sola (Couro Reta)** | Madeira (R$0), Avermelhada (R$10), Pintada de Preto (R$0) |
| **Cor Vira** | Neutra (R$0) |
| **Forma** | 6761 |

### Bloco PERFILADO
**Modelos**: Bota Bico Fino Perfilado, Bota Over, Capota Bico Fino Perfilado, Tradicional Bico Fino

| Campo | Regras |
|-------|--------|
| **Solados** | PVC (R$0), Couro Reta (R$60) |
| **Bico (PVC)** | Fino Agulha Ponta Quadrada |
| **Bico (Couro Reta)** | Fino Agulha Ponta Quadrada, Fino Agulha Ponta Redonda |
| **Cor Sola (PVC)** | Marrom (R$0) |
| **Cor Sola (Couro Reta)** | Madeira (R$0), Avermelhada (R$10), Pintada de Preto (R$0) |
| **Cor Vira** | Neutra (R$0) |
| **Forma** | 4394 |

**Fonte**: `getBlockForModelo()`, `getSoladosForModelo()`, `getBicosForModeloSolado()`, `getCorSolaOptions()`, `getCorViraOptions()`, `getForma()` em `src/lib/orderFieldsConfig.ts`

---

## D. Pesponto Condicional

Modelos que **não exibem** os campos Cor da Borrachinha e Cor do Vivo (exibem apenas Cor da Linha):

- Botina
- Botina Infantil
- Destroyer
- Coturno

**Fonte**: `HIDE_PESPONTO_EXTRAS` em `src/lib/orderFieldsConfig.ts`

---

## E. Couros e Adicional por Tipo

### Tipos de Couro com adicional de preço

| Tipo | Adicional |
|------|-----------|
| Estilizado em Dinossauro | +R$50 |
| Estilizado em Tatu | +R$40 |
| Aramado | +R$40 |
| Escamado | +R$20 |
| Estilizado Duplo | +R$20 |
| Vaca Holandesa | +R$15 |
| Vaca Pintada | +R$15 |
| Estilizado em Avestruz | +R$10 |

### Tipos de Couro sem adicional
Crazy Horse, Látego, Fóssil, Napa Flay, Floter, Nobuck, Estilizado em Arraia, Estilizado em Tilápia, Egípcio, Estilizado em Jacaré, Estilizado em Cobra

### Cores de Couro
Nescau, Café, Marrom, Preto, Telha, Mostarda, Bege, Azul, Vermelho, Rosa, Branco, Off White, Pinhão, Verde, Amarelo, Brasileiro, Americano, Cappuccino, Areia, Mustang, Rosa Neon, Laranja, Cru, Havana, Petróleo, Malhado, Chocolate, Castor

**Fonte**: `TIPOS_COURO`, `COURO_PRECOS`, `CORES_COURO` em `src/lib/orderFieldsConfig.ts`

---

## F. Bordados por Região

Cada região (Cano, Gáspea, Taloneira) possui lista e preços distintos.

### Exemplos de diferença de preço por região

| Bordado | Cano | Gáspea | Taloneira |
|---------|------|--------|-----------|
| Florência | R$25 | R$15 | R$10 |
| Peão Elite G | R$35 | R$20 | — |
| Velho Barreiro | R$70 | R$35 | — |
| Rozeta | R$35 | R$20 | — |
| Milionário | R$35 | R$20 | — |
| Monster | R$35 | R$20 | — |
| Logo Marca | R$50 | R$50 | R$50 |
| N. Senhora P | R$10 | R$10 | R$10 |

As listas completas estão nos arrays `BORDADOS_CANO`, `BORDADOS_GASPEA`, `BORDADOS_TALONEIRA`.

Bordados variados (disponíveis em todas as regiões): R$5, R$10, R$15, R$20, R$25, R$30, R$35.

**Fonte**: `src/lib/orderFieldsConfig.ts`

---

## G. Laser e Glitter

| Região | Laser | Glitter |
|--------|-------|---------|
| Cano | R$50 | R$30 |
| Gáspea | R$50 | R$30 |
| Taloneira | R$0 | R$0 |

### Opções de Laser
Cruz, Bridão, Pipoco, Ouro, Florência Brilhante, Folhas, Lara, Rodeio, Iluminada, Cruz Asas, Beca, Coração, Cruz Circular, Cruz Zero, Borboleta, Lívia, Luíza, Duquesa, Julia, Anjo, Pintura Cavalo, Outro

### Cores de Glitter
Dourado, Prata, Rosa Claro, Rosa Pink, Azul, Preto, Marrom, Vermelho

**Fonte**: `LASER_OPTIONS`, `COR_GLITTER`, constantes de preço em `src/lib/orderFieldsConfig.ts`

---

## H. Adicionais Fixos

| Item | Valor |
|------|-------|
| Sob medida | +R$50 |
| Nome bordado | +R$40 |
| Estampa | +R$30 |
| Trice | +R$20 |
| Costura atrás | +R$20 |
| Tiras | +R$15 |
| Pintura | +R$15 |
| Franja | +R$15 |
| Corrente | +R$10 |

**Fonte**: constantes `*_PRECO` em `src/lib/orderFieldsConfig.ts`

---

## I. Metais

| Campo | Opções |
|-------|--------|
| Área | Inteira (R$30), Metade da Bota (R$15) |
| Tipo | Rebite, Bola Grande |
| Cor | Níquel, Ouro Velho, Dourado |
| Strass | R$0,60/un |
| Cruz metal | R$6/un |
| Bridão metal | R$3/un |
| Cavalo metal | R$5/un |

**Fonte**: `AREA_METAL`, `TIPO_METAL`, `COR_METAL`, constantes unitárias em `src/lib/orderFieldsConfig.ts`

---

## J. Acessórios (embutidos na bota)

| Acessório | Preço |
|-----------|-------|
| Kit Faca | R$70 |
| Kit Canivete | R$60 |
| Kit Cantil | R$40 |
| Bolso | R$50 |
| Zíper inteiro | R$40 |

**Fonte**: `ACESSORIOS` em `src/lib/orderFieldsConfig.ts`

---

## K. Desenvolvimento

| Tipo | Preço |
|------|-------|
| Estampa | R$150 |
| Laser | R$100 |
| Bordado | R$50 |

**Fonte**: `DESENVOLVIMENTO` em `src/lib/orderFieldsConfig.ts`

---

## L. Carimbo

| Opção | Preço |
|-------|-------|
| Até 3 Carimbos | R$20 |
| Até 6 Carimbos | R$40 |

**Fonte**: `CARIMBO` em `src/lib/orderFieldsConfig.ts`

---

## M. Vira Oculta na Impressão

Cores de vira que **não aparecem** na descrição/PDF: **Bege** e **Neutra**.

**Fonte**: `VIRA_HIDDEN` em `src/lib/orderFieldsConfig.ts`

---

## N. Extras (Produtos Avulsos)

| Produto | Preço Base |
|---------|-----------|
| Tiras Laterais | R$15 |
| Desmanchar | Manual (a partir de R$65) |
| Kit Canivete | R$30 (+R$30 se vai canivete) |
| Kit Faca | R$35 (+R$35 se vai canivete) |
| Carimbo a Fogo | R$20 (1-3) ou R$40 (4-6) |
| Revitalizador (Unidade) | R$10/un |
| Kit 2 Revitalizador | R$26/kit |
| Gravata Country | R$30 |
| Adicionar Metais | Variável |
| Chaveiro c/ Carimbo | R$50 |
| Bainha de Cartão | R$15 |
| Regata | R$50 |
| Bota Pronta Entrega | Valor manual + extras embutidos |
| Gravata Pronta Entrega | R$30 |

> **Importante**: No banco de dados, o campo `preco` dos extras já armazena o valor total. Não multiplicar por quantidade na exibição da lista.

**Fonte**: `src/lib/extrasConfig.ts`

---

## O. Gravata Pronta Entrega

| Campo | Opções |
|-------|--------|
| Cor da tira | Preto, Marrom, Off White, Laranja |
| Tipo metal | Bota, Chapéu, Mula, Touro, Bridão Estrela, Bridão Flor, Cruz, Nossa Senhora |
| Cor do brilho | Preto, Azul, Rosa, Cristal *(só visível se metal = Bridão Estrela ou Bridão Flor)* |

**Fonte**: `src/lib/extrasConfig.ts`

---

## P. Bota Pronta Entrega — Extras Embutidos

Extras possíveis dentro de Bota PE:
- Adicionar Metais
- Carimbo a Fogo
- Kit Faca
- Kit Canivete
- Tiras Laterais

**Fonte**: `src/lib/botaExtraHelpers.ts`

---

## Q. Cintos

| Tamanho | Preço |
|---------|-------|
| 1,10 cm | R$100 |
| 1,25 cm | R$130 |
| 50 cm | R$70 |
| 70 cm | R$70 |

| Adicional | Preço |
|-----------|-------|
| Bordado P | +R$10 |
| Nome bordado | +R$40 |
| Carimbo 1-3 | +R$20 |
| Carimbo 4-6 | +R$40 |

**Fivelas**: Prata com Strass, Preta com Strass, Prata Touro, Prata Flor, Infantil, Quadrada, Outro

**Status do cinto** (8 etapas): Em aberto → Corte → Bordado → Pesponto → Expedição → Entregue → Cobrado → Pago

**Fonte**: `src/pages/BeltOrderPage.tsx`, `BELT_STATUSES` em `src/lib/order-logic.ts`

---

## R. Fluxos de Status

### Botas (23 etapas)
Em aberto → Aguardando → Aguardando Couro → Emprestado → Corte → Sem bordado → Bordado Dinei → Bordado Sandro → Entrada Bordado 7Estrivos → Baixa Bordado 7Estrivos → Pesponto 01 → Pesponto 02 → Pesponto 03 → Pesponto 04 → Pesponto 05 → Pesponto Ailton → Pespontando → Montagem → Revisão → Expedição → Baixa Estoque → Baixa Site (Despachado) → Entregue → Cobrado → Pago

> **Vendedores não veem**: "Baixa Estoque" e "Baixa Site (Despachado)" — usam `PRODUCTION_STATUSES_USER`

### Extras (6 etapas)
Em aberto → Produzindo → Expedição → Entregue → Cobrado → Pago

### Cintos (8 etapas)
Em aberto → Corte → Bordado → Pesponto → Expedição → Entregue → Cobrado → Pago

**Fonte**: `PRODUCTION_STATUSES`, `PRODUCTION_STATUSES_USER`, `EXTRAS_STATUSES`, `BELT_STATUSES` em `src/lib/order-logic.ts`

---

## S. RBAC (Controle de Acesso)

### Roles

| Role | Descrição |
|------|-----------|
| `admin_master` | Acesso total. Pode dar desconto (requer justificativa), limpar pedidos, gerenciar usuários |
| `admin_producao` | Relatórios, quadro de solado, alteração de status. **Proibido** ser vendedor em pedidos |
| `vendedor_comissao` | Dashboard com painel de comissão. Campo cliente visível para ADMs |
| `vendedor` | Acesso básico aos próprios pedidos |

### Regras de acesso

| Ação | Quem pode |
|------|-----------|
| Alteração de status de produção | `admin_master`, `admin_producao` (`ADMIN_STATUS_ROLES`) |
| Aplicar desconto | Apenas `admin_master` (requer justificativa obrigatória) |
| Gerenciar usuários | Apenas `admin_master` |
| Ver todos os pedidos | Admins (via `is_any_admin` no RLS) |
| Ver próprios pedidos | Vendedores (via `auth.uid() = user_id` no RLS) |

### Proteção de rotas

As rotas não possuem guards explícitos no React Router. A proteção é feita por:
1. Redirect no `AuthContext` (se não logado → `/login`)
2. RLS do Supabase (isolamento de dados)
3. Verificação de role no componente (ex: `UsersManagementPage` verifica `isAdmin`)

> **Melhoria futura sugerida**: Implementar guards explícitos nas rotas do React Router.

**Fonte**: `src/contexts/AuthContext.tsx`, `ADMIN_STATUS_ROLES` em `src/lib/order-logic.ts`

---

## T. Comissão

| Regra | Valor |
|-------|-------|
| Valor por venda qualificada | R$10 |
| Meta mensal | 60 vendas |
| Comissão paga se | vendas ≥ 60 no mês |

### Vendas qualificadas
- Bota (ficha normal)
- Bota Pronta Entrega
- Regata

### Pedidos excluídos da contagem
Prefixos: `TROCA`, `REFAZENDO`, `ERRO`, `INFLUENCER`

**Fonte**: `src/components/CommissionPanel.tsx`

---

## U. Numeração de Pedidos

| Tipo | Formato | Exemplo |
|------|---------|---------|
| Padrão | `7E-AAAA0001` | 7E-20260001 |
| Grade | `baseNumeroTamanhoSeq` | 7E-20263401 |

Duplicatas são bloqueadas em tempo real via `useCheckDuplicateOrder`.

**Fonte**: `src/hooks/useCheckDuplicateOrder.ts`

---

## V. Dias Úteis de Produção

| Tipo | Dias úteis |
|------|-----------|
| Bota | 15 dias úteis (default DB: `dias_restantes = 10`) |
| Cinto | 5 dias úteis |
| Extra | 1 dia útil |

---

## W. Couro — Prioridade para Relatórios

Ordem de prioridade na exibição: Crazy Horse > Látego > Nobuck > Fóssil > Floater > Napa Flay

**Fonte**: `src/pages/PiecesReportPage.tsx`

---

## X. Boot Calculator (Landing Page)

O componente `BootCalculator` na página inicial usa preços **ilustrativos** (`BASE_PRICE = R$650`) que **NÃO refletem** os preços reais do sistema. É apenas uma demonstração visual.

**Fonte**: `src/components/BootCalculator.tsx`

---

## Y. Cor da Linha / Borrachinha / Vivo

| Campo | Opções |
|-------|--------|
| Cor da Linha | Bege, Branca, Preta, Café, Vermelha, Azul, Verde, Rosa, Amarelo, Laranja |
| Cor Borrachinha | Preto, Marrom, Branco, Rosa |
| Cor do Vivo | Preto, Branco, Rosa, Azul, Laranja |

**Fonte**: `COR_LINHA`, `COR_BORRACHINHA`, `COR_VIVO` em `src/lib/orderFieldsConfig.ts`

---

## Z. Gênero

Opções: Feminino, Masculino

**Fonte**: `GENEROS` em `src/lib/orderFieldsConfig.ts`

---

## AA. Tamanhos

Faixa: 24 a 45 (22 tamanhos)

**Fonte**: `TAMANHOS` em `src/lib/orderFieldsConfig.ts`
