# Plano: Envio de Link de Rastreio via WhatsApp (wa.me)

## Objetivo

Permitir que vendedores/enviadores enviem o link da página pública de rastreio do pedido diretamente para o WhatsApp do cliente, usando `wa.me` (sem custo por mensagem, sem API oficial). Suporte a envio unitário no detalhe do pedido e envio em lote com fila guiada (1 clique por pedido).

## Decisões do usuário confirmadas


| Decisão                       | Escolha                                                                                                                                                                                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Caminho de envio**          | `wa.me` (gratuito, abre WhatsApp Web/App do celular/computador do vendedor)                                                                                                                                                                                                       |
| **Envio em lote**             | Fila guiada — seleciona vários pedidos, clica uma vez, sistema abre um WhatsApp de cada vez em sequência                                                                                                                                                                          |
| **O que é "loja"**            | Campos no perfil do usuário/vendedor (nome da loja + telefone oficial) — fixo por usuário                                                                                                                                                                                         |
| **Campo WhatsApp do cliente** | Na **ficha principal (bota/cinto)** e **também nos extras avulsos** — cada pedido/extra tem seu próprio cliente                                                                                                                                                                   |
| **Mensagem**                  | `Olá {cliente}! Seu pedido {número} da loja {nome da loja} foi cadastrado. Acompanhe a produção em tempo real com esse link: {link} — Esse contato é somente para avisos e não recebe mensagens, para dúvidas entre em contato com o número oficial da loja: {telefone da loja}.` |
| **Disparador**                | Botão manual no detalhe do pedido e botão em lote na listagem (não automático ao criar)                                                                                                                                                                                           |


## Escopo FORA deste plano

- Envio 100% automático no momento da criação do pedido (isso exige Z-API/Evolution ou WhatsApp Business API paga).
- Histórico de envios de WhatsApp dentro do sistema.
- Recebimento de respostas do cliente.

---

## 1. Banco de dados (Supabase migration)

### 1.1 Tabela `profiles` (perfil do vendedor)

Adicionar 2 campos:

- `nome_loja` text, nullable — nome comercial da loja que aparece na mensagem
- `telefone_loja` text, nullable — número oficial da loja (será formatado na mensagem)

### 1.2 Tabela `orders` (pedidos principais e extras)

Adicionar 1 campo:

- `cliente_whatsapp` text, nullable — número do cliente para receber o link de rastreio
  - Armazenado normalizado em formato E.164 no banco (ex: `5511999998888`)
  - Na UI, máscara `(XX) XXXXX-XXXX` para digitação
  - O campo é opcional; o botão de enviar WhatsApp só aparece se preenchido

---

## 2. Componentes e páginas — alterações

### 2.1 Perfil do usuário (`ProfilePage`, `UsersManagementPage`)

- Adicionar inputs: **Nome da Loja** e **Telefone da Loja** (com máscara)
- Campos editáveis pelo próprio usuário e pelo admin

### 2.2 Cadastro de pedido principal (`OrderPage`, `EditOrderPage`, `BeltOrderPage`)

- Adicionar input **WhatsApp do Cliente** (opcional, máscara `(XX) XXXXX-XXXX`) posicionado próximo ao campo "Cliente"
- Salvar normalizado no banco

### 2.3 Cadastro de extras avulsos (`ExtrasPage`, `EditExtrasPage`)

- Adicionar o mesmo input **WhatsApp do Cliente** (opcional)
- Cada extra é um pedido independente, portanto mantém seu próprio número

### 2.4 Detalhe do pedido (`OrderDetailPage`)

- Novo botão com ícone do WhatsApp (verde) e label **"Enviar WhatsApp"**
- O botão só aparece se `order.cliente_whatsapp` estiver preenchido
- Ao clicar:
  1. Monta a mensagem com template
  2. Abre `wa.me` em nova aba com telefone do cliente e mensagem pré-preenchida
  3. O vendedor confirma/envia no próprio WhatsApp

### 2.5 Envio em lote (listagens de pedidos)

- Reutilizar o mecanismo de `SelectedOrdersProvider` (seleção múltipla de pedidos)
- Novo botão nos actions de lote: **"Enviar WhatsApp (N)"** (onde N = pedidos selecionados que possuem `cliente_whatsapp`)
- Abrir modal de **fila guiada**:
  - Lista os pedidos com telefone
  - Mostra contador: "3 de 8 pedidos enviados"
  - Para o pedido atual:
    - **"Abrir WhatsApp"** → abre `wa.me` do pedido atual em nova aba
    - **"Já enviei"** → marca como enviado, avança para o próximo pedido
    - **"Pular"** → marca como não enviado, avança para o próximo
  - Pedidos sem `cliente_whatsapp` são ignorados da fila com indicador visual

---

## 3. Utilitários

### 3.1 Novo arquivo `src/lib/whatsappSend.ts`

Funções puras e reutilizáveis:

- `normalizePhoneBR(raw: string): string` — converte `(11) 99999-8888` → `5511999998888`
- `buildTrackingMessage(params): string` — monta a mensagem com template confirmado
- `buildWhatsappUrl(phoneE164: string, message: string): string` — retorna URL `wa.me` com encode correto
- `getPublicTrackingUrl(orderId: string): string` — retorna link da página pública de rastreio (`/rastreio/{id}`)

### 3.2 Integração com dados do vendedor

- Ao montar a mensagem, buscar `nome_loja` e `telefone_loja` do perfil do vendedor associado ao pedido (`vendedor_id`)
- Se o vendedor não tiver preenchido, usar fallback: nome do vendedor e telefone em branco na mensagem

---

## 4. Fluxo de experiência do usuário

### Unitário

1. Vendedor preenche o pedido e coloca o WhatsApp do cliente
2. No detalhe do pedido, clica em "Enviar WhatsApp"
3. Abre nova aba com WhatsApp Web/App já com a mensagem e link prontos
4. Vendedor clica em enviar no próprio WhatsApp

### Em lote

1. Vendedor seleciona múltiplos pedidos na listagem (checkboxes)
2. Clica em "Enviar WhatsApp (N)"
3. Abre modal de fila guiada
4. Para cada pedido, o sistema abre o `wa.me` automaticamente; o vendedor confirma o envio e clica "Já enviei" para ir ao próximo
5. Ao final, resumo de quantos foram enviados e quantos pulados

---

## 5. Testes de aceitação

- Campo "WhatsApp do Cliente" aparece e salva corretamente em pedido principal
- Campo "WhatsApp do Cliente" aparece e salva corretamente em extras
- Botão de WhatsApp no detalhe só aparece quando o campo está preenchido
- Mensagem gerada contém nome do cliente, número do pedido, nome da loja, link de rastreio e telefone da loja
- Fila guiada de lote avança corretamente e ignora pedidos sem telefone
- Campos de loja são salvos no perfil e refletidos nas mensagens