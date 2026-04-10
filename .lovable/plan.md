

## Seguro de Memoria — Documentacao e Consolidacao

### 1. Criar `docs/BUSINESS_RULES.md`

Documento completo e preciso baseado no codigo atual:

---

**A. MODELOS E PRECOS**

| Modelo | Preco |
|--------|-------|
| Bota Tradicional | R$260 |
| Bota Feminino | R$260 |
| Bota Peao | R$260 |
| Bota Montaria (40) | R$270 |
| Coturno | R$240 |
| Destroyer | R$200 |
| Capota | R$230 |
| Capota Bico Fino | R$230 |
| Capota Bico Fino Perfilado | R$230 |
| Cano Medio | R$205 |
| Botina | R$200 |
| Bota Infantil | R$170 |
| Botina Infantil | R$160 |
| Bota Over | R$270 |
| Urbano | R$260 |
| Bota Bico Fino Feminino | R$260 |
| Bota Bico Fino Perfilado | R$260 |
| Tradicional Bico Fino | R$260 |
| Cano Medio Infantil | R$160 |
| City | R$270 |
| Cano Inteiro | R$260 |

---

**B. VINCULACAO TAMANHO → MODELO**

- 24-33: Bota Infantil, Botina Infantil, Cano Medio Infantil
- 34-45: Bota Tradicional, Bota Feminino, Bota Peao, Coturno, Destroyer, Capota, Bota Over, Capota Bico Fino Perfilado, Cano Medio, Botina, Urbano, Bota Bico Fino Perfilado, Tradicional Bico Fino, Cano Inteiro
- 34-40: Bota Montaria (40) (so ate 40)
- 33-40: Bota Bico Fino Feminino, Capota Bico Fino
- 34-40: City

---

**C. BLOCOS DE MODELO → SOLADO → BICO → COR SOLA → COR VIRA → FORMA**

5 blocos definem toda a cadeia de dependencias:

**Bloco INFANTIL** (Bota Infantil, Botina Infantil, Cano Medio Infantil)
- Solado: Infantil (R$0)
- Bico: Quadrado
- Cor Sola: nenhuma (campo oculto)
- Cor Vira: Bege (R$0)
- Forma: 1652

**Bloco CITY** (City)
- Solado: Borracha City (R$0)
- Bico: Fino Ponta Redonda
- Cor Sola: Preto (R$0)
- Cor Vira: Neutra (R$0)
- Forma: 13446

**Bloco TRADICIONAL** (Bota Tradicional, Bota Feminino, Bota Peao, Bota Montaria (40), Coturno, Destroyer, Capota, Cano Medio, Botina, Urbano, Cano Inteiro)
- Solados: Borracha (R$0), Couro Reta (R$60), Couro Carrapeta (R$60), Couro Carrapeta com Espaco Espora (R$60), Jump (R$30), Rustica (R$0)
  - Se bico = Redondo: Remove Jump e Rustica
- Bico: Quadrado, Redondo
- Cor Sola:
  - Borracha: Marrom (R$20), Preto (R$0), Branco (R$20). Se bico Redondo: apenas Preto e Branco
  - Couro Reta/Carrapeta/Carrapeta c/ Espaco: Madeira (R$0), Avermelhada (R$10), Pintada de Preto (R$0)
  - Jump: campo oculto
  - Rustica: Madeira (R$0)
- Cor Vira:
  - Borracha: Bege (R$0), Rosa (R$10), Preto (R$10)
  - Demais solados: Neutra (R$0)
- Forma: bico Redondo = 7576, bico Quadrado = 2300

**Bloco BICO FINO FEMININO** (Bota Bico Fino Feminino, Capota Bico Fino)
- Solados: PVC (R$0), Couro Reta (R$60)
- Bico: Fino Ponta Redonda
- Cor Sola:
  - PVC: Preto (R$0), Off White (R$0), Marrom (R$0)
  - Couro Reta: Madeira (R$0), Avermelhada (R$10), Pintada de Preto (R$0)
- Cor Vira: Neutra (R$0)
- Forma: 6761

**Bloco PERFILADO** (Bota Bico Fino Perfilado, Bota Over, Capota Bico Fino Perfilado, Tradicional Bico Fino)
- Solados: PVC (R$0), Couro Reta (R$60)
- Bico:
  - PVC: Fino Agulha Ponta Quadrada
  - Couro Reta: Fino Agulha Ponta Quadrada, Fino Agulha Ponta Redonda
- Cor Sola:
  - PVC: Marrom (R$0)
  - Couro Reta: Madeira (R$0), Avermelhada (R$10), Pintada de Preto (R$0)
- Cor Vira: Neutra (R$0)
- Forma: 4394

---

**D. PESPONTO CONDICIONAL**
Modelos sem borrachinha/vivo (so cor da linha): Botina, Botina Infantil, Destroyer, Coturno

---

**E. COUROS E ADICIONAL POR TIPO**

Tipos: Crazy Horse, Latego, Fossil, Napa Flay, Floter, Nobuck, Estilizado em Avestruz (+R$10), Estilizado em Arraia, Estilizado em Tilapia, Egipcio, Estilizado em Jacare, Estilizado em Cobra, Estilizado em Dinossauro (+R$50), Aramado (+R$40), Escamado (+R$20), Estilizado Duplo (+R$20), Estilizado em Tatu (+R$40), Vaca Holandesa (+R$15), Vaca Pintada (+R$15)

Cores: Nescau, Cafe, Marrom, Preto, Telha, Mostarda, Bege, Azul, Vermelho, Rosa, Branco, Off White, Pinhao, Verde, Amarelo, Brasileiro, Americano, Cappuccino, Areia, Mustang, Rosa Neon, Laranja, Cru, Havana, Petroleo, Malhado, Chocolate, Castor

---

**F. BORDADOS POR REGIAO**

Cano, Gaspea e Taloneira tem listas e precos distintos (ver arrays BORDADOS_CANO, BORDADOS_GASPEA, BORDADOS_TALONEIRA em orderFieldsConfig.ts). Exemplos:
- Florencia: Cano R$25, Gaspea R$15, Taloneira R$10
- Velho Barreiro: Cano R$70, Gaspea R$35 (nao disponivel na taloneira)

---

**G. LASER E GLITTER**
- Laser Cano: R$50, Gaspea: R$50, Taloneira: R$0
- Glitter Cano: R$30, Gaspea: R$30, Taloneira: R$0
- Opcoes laser: Cruz, Bridao, Pipoco, Ouro, Florencia Brilhante, Folhas, Lara, Rodeio, Iluminada, Cruz Asas, Beca, Coracao, Cruz Circular, Cruz Zero, Borboleta, Livia, Luiza, Duquesa, Julia, Anjo, Pintura Cavalo, Outro
- Cores glitter: Dourado, Prata, Rosa Claro, Rosa Pink, Azul, Preto, Marrom, Vermelho

---

**H. ADICIONAIS FIXOS**
- Sob medida: +R$50
- Nome bordado: +R$40
- Estampa: +R$30
- Pintura: +R$15
- Trice: +R$20
- Tiras: +R$15
- Costura atras: +R$20
- Franja: +R$15
- Corrente: +R$10

---

**I. METAIS**
- Area: Inteira (R$30), Metade da Bota (R$15)
- Tipo: Rebite, Bola Grande
- Cor: Niquel, Ouro Velho, Dourado
- Strass: R$0.60/un
- Cruz metal: R$6/un
- Bridao metal: R$3/un
- Cavalo metal: R$5/un

---

**J. ACESSORIOS (embutidos na bota)**
- Kit Faca: R$70
- Kit Canivete: R$60
- Kit Cantil: R$40
- Bolso: R$50
- Ziper inteiro: R$40

---

**K. DESENVOLVIMENTO**
- Estampa: R$150
- Laser: R$100
- Bordado: R$50

---

**L. CARIMBO**
- Ate 3 Carimbos: R$20
- Ate 6 Carimbos: R$40

---

**M. VIRA OCULTA NA IMPRESSAO**
- Cores "Bege" e "Neutra" nao aparecem na descricao/PDF

---

**N. EXTRAS (PRODUTOS AVULSOS)**

| Produto | Preco Base |
|---------|-----------|
| Tiras Laterais | R$15 |
| Desmanchar | Manual (a partir de R$65) |
| Kit Canivete | R$30 (+ R$30 se vai canivete) |
| Kit Faca | R$35 (+ R$35 se vai canivete) |
| Carimbo a Fogo | R$20 (1-3) ou R$40 (4-6) |
| Revitalizador (Unidade) | R$10/un |
| Kit 2 Revitalizador | R$26/kit |
| Gravata Country | R$30 |
| Adicionar Metais | Variavel |
| Chaveiro c/ Carimbo | R$50 |
| Bainha de Cartao | R$15 |
| Regata | R$50 |
| Bota Pronta Entrega | Valor manual + extras embutidos |
| Gravata Pronta Entrega | R$30 |

Extras no DB: campo `preco` ja armazena o valor total (nao multiplicar por quantidade na lista).

---

**O. GRAVATA PRONTA ENTREGA**
- Cor tira: Preto, Marrom, Off White, Laranja
- Tipo metal: Bota, Chapeu, Mula, Touro, Bridao Estrela, Bridao Flor, Cruz, Nossa Senhora
- Cor brilho (so visivel se metal = Bridao Estrela ou Bridao Flor): Preto, Azul, Rosa, Cristal

---

**P. BOTA PRONTA ENTREGA — EXTRAS EMBUTIDOS**
Extras possiveis dentro de Bota PE: Adicionar Metais, Carimbo a Fogo, Kit Faca, Kit Canivete, Tiras Laterais
(precificacao em botaExtraHelpers.ts)

---

**Q. CINTOS**

| Tamanho | Preco |
|---------|-------|
| 1,10 cm | R$100 |
| 1,25 cm | R$130 |
| 50 cm | R$70 |
| 70 cm | R$70 |

- Bordado P: +R$10
- Nome bordado: +R$40
- Carimbo: 1-3 R$20, 4-6 R$40
- Fivelas: Prata com Strass, Preta com Strass, Prata Touro, Prata Flor, Infantil, Quadrada, Outro

---

**R. FLUXOS DE STATUS**

Botas (22 etapas): Em aberto → Aguardando → Emprestado → Corte → Sem bordado → Bordado Dinei → Bordado Sandro → Bordado 7Estrivos → Pesponto 01 → Pesponto 02 → Pesponto 03 → Pesponto 04 → Pesponto 05 → Pespontando → Montagem → Revisao → Expedicao → Baixa Estoque → Baixa Site (Despachado) → Entregue → Cobrado → Pago

Vendedores nao veem: "Baixa Estoque" e "Baixa Site (Despachado)" (PRODUCTION_STATUSES_USER)

Extras (6 etapas): Em aberto → Produzindo → Expedicao → Entregue → Cobrado → Pago

Cintos (8 etapas): Em aberto → Corte → Bordado → Pesponto → Expedicao → Entregue → Cobrado → Pago

---

**S. RBAC**

Roles: admin_master, admin_producao, vendedor_comissao, vendedor

- admin_master: acesso total, pode dar desconto (requer justificativa), pode limpar pedidos, gerenciar usuarios
- admin_producao: relatorios, quadro solado, alteracao de status. Proibido ser vendedor em pedidos
- vendedor_comissao: dashboard com painel de comissao, ve campo cliente (para ADMs)
- vendedor: acesso basico aos proprios pedidos

Alteracao de status: apenas admin_master e admin_producao (ADMIN_STATUS_ROLES)

RLS no Supabase: vendedores so veem proprios pedidos (auth.uid() = user_id); admins veem todos (is_any_admin)

Rotas nao tem guards explicitos no React Router — a protecao e feita por redirect no AuthContext + RLS no banco

---

**T. COMISSAO**

- R$10 por venda qualificada
- Vendas qualificadas: bota (ficha normal), bota_pronta_entrega, regata
- Meta mensal: 60 vendas; comissao so paga se meta batida (vendas >= 60)
- Pedidos excluidos: prefixos TROCA, REFAZENDO, ERRO, INFLUENCER

---

**U. NUMERACAO DE PEDIDOS**
- Formato padrao: 7E-AAAA0001
- Grade: baseNumeroTamanhoSeq (ex: 7E-20263401)
- Duplicatas bloqueadas em tempo real

---

**V. DIAS UTEIS DE PRODUCAO**
- Bota: 15 dias uteis (diasRestantes default = 10 no DB)
- Cinto: 5 dias uteis
- Extra: 1 dia util

---

**W. COURO — PRIORIDADE PARA RELATORIOS**
Crazy Horse > Latego > Nobuck > Fossil > Floater > Napa Flay

---

**X. BOOT CALCULATOR (Landing Page)**
O BootCalculator na pagina inicial usa precos ilustrativos (BASE_PRICE = R$650) que NAO refletem os precos reais do sistema.

---

### 2. Mover constante hardcoded

| Constante | Origem | Destino |
|-----------|--------|---------|
| `HIDE_PESPONTO_EXTRAS` = ['Botina', 'Botina Infantil', 'Destroyer', 'Coturno'] | OrderPage.tsx (linha 367) | orderFieldsConfig.ts |

Exportar e importar no OrderPage.tsx. O EditOrderPage.tsx nao usa essa constante hoje (pode ser adicionada para consistencia futura).

---

### 3. Confirmacao RBAC

As rotas no App.tsx nao tem guards React Router explicitos — a protecao e feita por:
1. Redirect no AuthContext (se nao logado, redireciona para /login)
2. RLS do Supabase (vendedor so ve proprios pedidos)
3. Verificacao de role no componente (ex: UsersManagementPage verifica isAdmin)
4. Desconto restrito a admin_master via UI

Isso esta funcional mas nao e ideal — guards explicitos nas rotas seriam mais seguros. Sera documentado como melhoria futura.

---

### Resumo de alteracoes

| Acao | Arquivo |
|------|---------|
| Criar | `docs/BUSINESS_RULES.md` (conteudo completo acima) |
| Mover constante | `HIDE_PESPONTO_EXTRAS` de OrderPage.tsx para orderFieldsConfig.ts |
| Atualizar import | OrderPage.tsx (importar de orderFieldsConfig) |

Nenhuma funcionalidade sera alterada.

