## Restaurar botão de edição (lápis) no Bloco 2 — Detalhes da Bota

### Problema
Na reorganização anterior do detalhe do pedido, o botão lápis foi removido do Bloco 1 com a intenção de movê-lo para o Bloco 2 ("Detalhes da Bota"), mas não chegou a ser renderizado lá. O ícone `Pencil` está importado em `OrderDetailPage.tsx`, porém sem uso no JSX.

### Solução
Adicionar o botão lápis no cabeçalho do Bloco 2, ao lado do título "Detalhes da Bota / Detalhes — {Extra}", apontando para a mesma rota que o `OrderCard` já usa, levando à página "Faça seu pedido / Bota" (ou Extras / Cinto, conforme o tipo do pedido).

### Comportamento
- Visível apenas para quem pode editar (mesma regra usada hoje no `OrderCard`: `isAdmin` — admin_master e admin_producao).
- Rota destino, replicando a lógica existente:
  - `tipoExtra === 'cinto'` → `/pedido/:id/editar-cinto`
  - outro `tipoExtra` → `/pedido/:id/editar-extra`
  - sem `tipoExtra` (bota) → `/pedido/:id/editar`
- Preserva `location.search` ao navegar (mantém filtros/contexto, igual ao card).
- Tooltip "Editar pedido", estilo idêntico ao do card (botão pequeno, cor primária, hover suave).

### Posicionamento
Cabeçalho do Bloco 2 vira um flex com o título à esquerda e o lápis à direita:

```text
[ Detalhes da Bota                                    [✏️] ]
---------------------------------------------------------
( conteúdo do bloco )
```

### Detalhes técnicos
- Arquivo: `src/pages/OrderDetailPage.tsx` (linhas ~972-977).
- Envolver o `<h2>` em um `<div className="flex items-center justify-between mb-3">` e adicionar o `<button>` com `<Pencil size={16} />` ao lado.
- Reaproveitar `useNavigate` e `useLocation` (já presentes na página) e o role check já existente para o checkbox "Conferido"/edição de valor (admin_master / admin_producao = `isAdmin`).
- Nenhuma alteração em rotas, hooks ou lógica de negócio. Apenas UI.

### Fora do escopo
- Não mexer em Bloco 1, composição, subtotal/total, auto-correção de preço — tudo isso permanece como ficou.
