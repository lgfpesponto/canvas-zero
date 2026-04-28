# Mostrar quem fez cada alteração no Histórico de Produção e no Histórico de Alterações

## O que muda

Hoje, no detalhe de um pedido (`/pedido/:id`), o **Histórico de Impressão** mostra `data, hora, tipo — usuário`. Já o **Histórico de Produção** (mudanças de status) e o **Histórico de Alterações** (edições de campos) só mostram `data, hora, descrição` — não dizem quem fez. Vamos passar a registrar e exibir o **nome do usuário** que fez cada movimentação, igual ao histórico de impressão.

### Como vai aparecer

**Histórico de Produção** (cada item):
```
✔ Bordado Dinei
  28/04/2026 às 14:32 — Pedido movido para Bordado Dinei
  por Juliana Cristina Ribeiro
  Observação: ... (se houver)
```

**Histórico de Alterações** (cada item):
```
28/04/2026 às 14:35 — por Fernanda
Alterado Cor da linha de "Branco" para "Preto"
```

## Onde mexer

### 1. Banco de dados
Os campos `historico` e `alteracoes` da tabela `orders` são `jsonb`, então **não precisa migração** — apenas passamos a gravar uma chave nova `usuario` em cada item novo. Itens antigos (sem `usuario`) continuam funcionando: a tela mostra "—" quando o campo não existir.

### 2. Tipos (`src/contexts/AuthContext.tsx`)
- `Order.historico`: adicionar campo opcional `usuario?: string`.
- `OrderAlteracao`: adicionar campo opcional `usuario?: string`.

### 3. Gravação do usuário
Em todo lugar que insere item em `historico` ou `alteracoes`, gravar `usuario: <nome do usuário logado>` (usar `user.nomeCompleto` do `useAuth()`):

- `AuthContext.updateOrderStatus` (mudança de status normal) — adicionar `usuario` no `newHistEntry`.
- `AuthContext.updateOrder` (edições de campos) — adicionar `usuario` em cada `OrderAlteracao` criado em `changes`.
- `AuthContext.addOrder` e `addOrderBatch` — gravar usuário no item inicial "Pedido criado".
- `OrderDetailPage.tsx` linha ~399 (mudança de status em lote pelo botão "Mudar progresso") — adicionar `usuario` no `newHist`.
- `OrderDetailPage.tsx` linha ~890 (alteração que cria entrada em `alteracoes`) — adicionar `usuario`.

Para isso, o `AuthContext` já tem o `user` em escopo; basta ler `user?.nomeCompleto` no momento da escrita. Nas chamadas em componentes (que não passam pelo context), passamos o nome explicitamente.

### 4. Exibição (`src/pages/OrderDetailPage.tsx`)
- Bloco "Histórico de Produção" (linhas 511-529): adicionar uma linha `por {h.usuario || '—'}` abaixo da descrição.
- Bloco "Histórico de Alterações" (linhas 531-548): adicionar `por {a.usuario || '—'}` ao lado da data/hora.

## Observação importante sobre dados antigos

Itens já existentes no banco não têm o campo `usuario`. A tela vai mostrar "—" para esses casos. **Não vamos** tentar preencher retroativamente, pois não há como saber quem fez aquelas alterações no passado.
