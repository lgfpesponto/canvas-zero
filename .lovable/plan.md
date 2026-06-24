## Objetivo
Criar role/portal **Montagem** + nova etapa **Baixa Montagem** no fluxo de produção, com scanner em massa, PDF de baixas em duas vias e regra de "ERRO MONTAGEM" para não cobrar duas vezes.

## 1. Fluxo de produção (statusTransitions.ts + status_etapas)

Inserir nova etapa **"Baixa Montagem"** entre Montagem e o que vem depois:

```text
Pespontando ──┐
              ├─→ Montagem ──┐
Pesponto Ailton ─→ Montagem Ailton ─┤
                                    ↓
                            Baixa Montagem
                                    ↓
                    Revisão / Expedição / Baixa Site / Baixa Estoque
```

- `Montagem` e `Montagem Ailton` passam a ter como destino válido APENAS `Baixa Montagem` (+ Aguardando/Cancelado pelo fluxo livre).
- `Baixa Montagem` herda os destinos atuais da Montagem: `Revisão`, `Expedição`, `Baixa Site (Despachado)`, `Baixa Estoque`.
- Etapas posteriores (Revisão/Expedição/Baixas) continuam podendo voltar a `Montagem` ou `Montagem Ailton` via retrocesso justificado.

## 2. Banco de dados (migration)

1. `INSERT` em `status_etapas` a etapa `Baixa Montagem` (ordem entre Montagem e Revisão).
2. Adicionar `'montagem'` no enum `app_role`.
3. Criar usuário `montagem@7estrivos.app` / senha `montagem123`, `nome_completo = 'Montagem'`, role `montagem` em `user_roles`.
4. RPC `montagem_baixar_pedido(_order_id uuid)` SECURITY DEFINER:
   - Permissão: role `montagem` ou `admin_master`.
   - Só aceita pedidos com status atual em `('Montagem','Montagem Ailton')`; senão erro claro pro toast.
   - Move para `Baixa Montagem`, adiciona histórico `{local: 'Baixa Montagem', descricao: 'Baixa de montagem via scanner', usuario}`.
   - Retorna `{ok, numero, quantidade, modelo, status_anterior}` para o frontend montar a lista.
5. RPC `montagem_marcar_erro(_order_id uuid)` SECURITY DEFINER (admin_producao/admin_master):
   - Usada pelo botão **"ERRO MONTAGEM"** ao retroceder de etapas pós-Baixa Montagem para Montagem/Montagem Ailton.
   - Faz UPDATE status + grava `extra_detalhes.montagem_erro = true` (flag persistente) e histórico com `descricao = 'ERRO MONTAGEM'`, sem exigir justificativa.
6. RLS em `orders`: permitir SELECT/UPDATE pelo role `montagem` apenas em pedidos com status em `('Montagem','Montagem Ailton','Baixa Montagem')` e apenas das colunas tocadas pela RPC (UPDATE via RPC SECURITY DEFINER já cobre).

## 3. Frontend

### 3.1 Auth / rotas
- `AuthContext`: adicionar `'montagem'` ao tipo de role.
- `App.tsx`:
  - `MONTAGEM_ALLOWED = {'/montagem','/perfil'}`.
  - `ChromeWrapper`: se `role === 'montagem'`, esconde header e redireciona para `/montagem`.
  - Nova rota `/montagem` → `MontagemPortalPage`.
- `LoginPage`: após login com role `montagem`, redireciona para `/montagem`.

### 3.2 `src/pages/MontagemPortalPage.tsx` (novo, página única)

Layout: scanner à esquerda, lista da sessão à direita, ações embaixo.

Estados: `iniciada: boolean`, `pedidos: ScannedPedido[]`.

Botões:
- **"Começar baixa"** → ativa scanner (foco no input/câmera).
- Scanner lê código de barras → resolve pedido (via lógica atual `useOrderById`/suffix) → chama `montagem_baixar_pedido`:
  - Sucesso: adiciona `{numero, quantidade, modelo, valor_unit, valor_total, erro_montagem}` à lista. Mostra toast curto.
  - Erro (status fora de Montagem/Montagem Ailton): toast vermelho "Pedido em <status> — não pode dar baixa", NÃO adiciona à lista.
- Cada item da lista tem um **X** → abre dialog de justificativa e regride para `Montagem`/`Montagem Ailton` (origem registrada antes da baixa), removendo da lista.
- **"Finalizar baixa"** → encerra o scanner, mantém a lista visível.
- **"Imprimir relatório"** → gera PDF (ver 3.4).
- **"Nova baixa"** → confirma → zera lista local (pedidos continuam em `Baixa Montagem` no banco).

Sem listagem geral de pedidos; só os escaneados na sessão.

### 3.3 Botão **"ERRO MONTAGEM"** (admin_producao / admin_master)
- Onde: modal de justificativa em `ReportsPage`/`OrderDetail` quando o destino é `Montagem` ou `Montagem Ailton` vindo de etapa posterior a `Baixa Montagem`.
- Renderizado abaixo do textarea de justificativa, ao lado do botão "Confirmar".
- Ao clicar: chama `montagem_marcar_erro` (sem justificativa), fecha modal.

### 3.4 Tabela de valores por modelo (`src/lib/montagemValores.ts`)

```ts
const VALOR_23 = ['Capota Bico Fino','Capota Bico Fino Perfilado','Bota Bico Fino Feminino',
                  'Bota Bico Fino Perfilado','Tradicional Bico Fino','Bota Over','City'];
const VALOR_21 = ['Bota Tradicional','Bota Feminino','Bota Peão','Bota Montaria (40)',
                  'Capota','Cano Inteiro','Urbana','Coturno'];
const VALOR_19 = ['Botina','Bota Infantil','Botina Infantil','Cano Médio Infantil',
                  'Destroyer','Cano Médio'];
```

Função `getValorMontagem(modelo)` retorna 19/21/23/0. Matching case-insensitive e tolerante a acento. Modelos não mapeados: valor 0 + flag de alerta no PDF (linha "modelo não tabelado").

### 3.5 PDF de baixas (`src/lib/pdfGenerators.ts` → `gerarPdfBaixaMontagem`)

- Formato: A4, **2 vias idênticas** na mesma folha (uma metade superior / outra metade inferior, separadas por linha tracejada "----- via cliente / via 7Estrivos -----").
- Cabeçalho: "Relatório de Baixa Montagem — DD/MM/AAAA HH:mm".
- Tabela: `#`, `Nº pedido`, `Data baixa`, `Modelo`, `Valor`.
  - Itens com `erro_montagem = true` aparecem na coluna Valor como **"ERRO MONTAGEM"** (vermelho).
- Totais ao final:
  - `Qtd × R$ 19,00 = R$ X`
  - `Qtd × R$ 21,00 = R$ X`
  - `Qtd × R$ 23,00 = R$ X`
  - `ERRO MONTAGEM: Qtd (não cobrado)`
  - `TOTAL GERAL: R$ X`
- Rodapé de cada via: linhas em branco `Assinatura: ______________________   Data: ___/___/____`.

## 4. Detalhes técnicos

- **Persistência do "erro montagem"**: gravado em `orders.extra_detalhes.montagem_erro = true` no momento do retrocesso. Consumido pelo `montagem_baixar_pedido` (que retorna a flag) e pelo PDF. Não é limpo automaticamente — esse pedido NUNCA mais será cobrado de montagem.
- **Modelo do pedido**: hoje vem de `extra_detalhes`/ficha; a RPC devolve o campo já resolvido para o frontend não depender de leitura adicional.
- **Quantidade**: `orders.quantidade` (e nos `bota_pronta_entrega` com `botas[]`, usa `jsonb_array_length`).
- **Sem alteração** em fluxos de bordado, cinto ou extras.

## 5. Arquivos tocados

- migration nova (status_etapas, enum, user, RPCs, RLS).
- `src/contexts/AuthContext.tsx`
- `src/App.tsx`
- `src/pages/LoginPage.tsx`
- `src/pages/MontagemPortalPage.tsx` (novo)
- `src/lib/montagemValores.ts` (novo)
- `src/lib/statusTransitions.ts`
- `src/lib/pdfGenerators.ts` (nova função PDF)
- `src/components/JustificativaDialog.tsx` (botão ERRO MONTAGEM condicional)
- `src/pages/ReportsPage.tsx` / `OrderDetailPage.tsx` (passar contexto pro dialog)
