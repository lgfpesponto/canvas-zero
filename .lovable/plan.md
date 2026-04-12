

## Plano: Espelhar a ficha de pedido de bota no editor admin

### Problema
A pagina de edicao da ficha "Bota" em Configuracoes mostra categorias e variacoes em formato generico (collapsible cards). O usuario quer que essa pagina espelhe exatamente o layout do formulario "Faca seu pedido" > "Bota", com as mesmas secoes (Couros, Bordados, Laser, Pesponto, Metais, Extras, Solados, etc.), mas com controles de edicao inline em cada campo.

### Solucao

Reescrever `AdminConfigFichaPage.tsx` para que, quando o slug for `bota`, renderize um layout espelhado do OrderPage com as seguintes secoes na mesma ordem:

```text
1. Tamanho / Genero / Modelo
2. Sob Medida
3. Acessorios
4. Couros (Tipo + Cor por regiao)
5. Desenvolvimento
6. Bordados (Cano / Gaspea / Taloneira)
7. Nome Bordado
8. Laser (Cano / Gaspea / Taloneira + Pintura)
9. Estampa
10. Pesponto (Cor Linha / Borrachinha / Vivo)
11. Metais
12. Extras (Trice / Tiras / Franja / Corrente)
13. Solados (Tipo / Bico / Cor Sola / Cor Vira)
14. Carimbo a Fogo
```

**Cada secao mostra:**
- O titulo da secao igual ao formulario
- As variacoes/opcoes atuais listadas (vindas de `ficha_categorias` + `ficha_variacoes` + arrays hardcoded como fallback)
- Botoes de edicao inline (nome, preco, ativo, ordem) em cada variacao
- Botao "+" para adicionar nova variacao com campos: nome, preco, tipo (selecao/multipla/checkbox/texto), obrigatorio, e **relacionamento** (multi-select para vincular a outras categorias)
- Botao de relacionamento (link) para variacoes existentes

**Para fichas dinamicas** (nao-bota): manter o layout atual com campos + categorias genericos.

### Layout visual

```text
┌──────────────────────────────────────┐
│ ← configuracoes         [Salvar]     │
│ bota                                 │
│                                      │
│ ── Tamanho / Genero / Modelo ──────  │
│ Modelos: [City ✏️] [Tradicional ✏️]  │
│          [+ adicionar]               │
│                                      │
│ ── Couros ─────────────────────────  │
│ Tipos de Couro: [Vaqueta ✏️] [...]   │
│ Cores de Couro: [Preto ✏️] [...]     │
│          [+ adicionar]               │
│                                      │
│ ── Bordados ───────────────────────  │
│ Bordado Cano: [7Estrivos ✏️ R$25]    │
│               [Estrelas ✏️ R$25]     │
│               [+ adicionar]          │
│ Bordado Gaspea: [...]                │
│ Bordado Taloneira: [...]             │
│                                      │
│ ... (demais secoes)                  │
└──────────────────────────────────────┘
```

### Mapeamento secoes → categorias do banco

Cada secao do formulario corresponde a uma ou mais categorias em `ficha_categorias`. Se a categoria nao existir no banco, as opcoes hardcoded de `orderFieldsConfig.ts` sao exibidas como referencia (read-only), e o admin pode criar a categoria para comecar a gerenciar pelo banco.

| Secao do formulario | Categoria slug esperado | Fallback hardcoded |
|---------------------|------------------------|--------------------|
| Modelo | modelos | MODELOS |
| Tipo Couro | tipos-couro | TIPOS_COURO |
| Cor Couro | cores-couro | CORES_COURO |
| Acessorios | acessorios | ACESSORIOS |
| Bordado Cano | bordados-cano | BORDADOS_CANO |
| Bordado Gaspea | bordados-gaspea | BORDADOS_GASPEA |
| Bordado Taloneira | bordados-taloneira | BORDADOS_TALONEIRA |
| Laser Cano | laser-cano | LASER_OPTIONS |
| Laser Gaspea | laser-gaspea | LASER_OPTIONS |
| Laser Taloneira | laser-taloneira | LASER_OPTIONS |
| Solado | solados | SOLADO |
| Formato Bico | formato-bico | FORMATO_BICO |
| Cor Sola | cor-sola | COR_SOLA |
| Cor Vira | cor-vira | COR_VIRA |

### Ao adicionar nova variacao

O dialog de "+" inclui:
- Nome
- Preco adicional
- Tipo do campo (selecao, multipla escolha, checkbox, texto)
- Obrigatorio (switch)
- Relacionamento (multi-select mostrando variacoes de outras categorias da mesma ficha)

### Arquivos afetados

| Arquivo | Acao |
|---------|------|
| `src/pages/AdminConfigFichaPage.tsx` | Reescrever layout para bota espelhando OrderPage; manter layout generico para fichas dinamicas |

### O que NAO muda
- `OrderPage.tsx` -- nao e tocado
- Pedidos antigos -- nao sao afetados
- Logica de preco -- nao muda
- Fichas dinamicas -- mantém o layout atual de campos + categorias genericos

