# Menu de ações (3 pontinhos) nos pedidos Bagy

## Objetivo
Cada pedido Bagy na lista de `/rancho-chique/pedidos` ganha um botão de 3 pontinhos (⋮) com um menu de ações da nota fiscal, inspirado no modelo enviado. As ações aparecem conforme a situação da nota daquele pedido (sem nota, rascunho, autorizada, cancelada).

## O que será construído

### 1. Menu ⋮ em cada pedido Bagy
Novo componente `src/components/fiscal/BagyNfeMenu.tsx` (DropdownMenu do shadcn), exibido ao lado dos badges "Pedido criado / Sem mapeamento", só para quem tem acesso à NF-e (Igor e Juliana).

Itens do menu:
- **Gerar / Alterar rascunho** — abre a janela de NF-e já existente (a mesma do botão "Gerar NF-e")
- **Enviar por e-mail** — envia o DANFE em PDF + XML para o e-mail do cliente (via edge function; usa o e-mail cadastrado no pedido Bagy)
- **Enviar por WhatsApp** — abre o WhatsApp do cliente com mensagem pronta e link da nota
- **Enviar espelho da NF** — mostra/baixa um resumo simples da nota (sem valor fiscal) para conferência
- **Gerar PDF DANFE** — baixa/imprime o DANFE (etiqueta térmica 100×150 ou A4), só para nota autorizada
- **Cancelar NF-e** — pede justificativa (mín. 15 letras) e registra o cancelamento na SEFAZ, com confirmação na tela
- **Outras opções de NF-e** (submenu):
  - **Carta de correção** — texto livre enviado à SEFAZ (não altera valores)
  - **NFe complementar** — emite nota complementar vinculada (para acrescentar valor/imposto)
- **Excluir rascunho** — remove nota que ainda não foi autorizada (rascunho/rejeitada/erro). Nota autorizada nunca é excluída, só cancelada.

### 2. Situação da nota visível no pedido
Pequeno selo ao lado do menu mostrando: "Sem nota", "Rascunho", "Autorizada nº X", "Cancelada" ou "Rejeitada" (lendo `nfe_notas` por `bagy_pedido_id`).

### 3. O que NÃO entra (itens do print que são de outro sistema)
Emitir boletos, estornar contas, lançar estoque, gerar devolução e clonar nota são funções de ERP financeiro que não existem no portal — ficam fora. Se quiser alguma delas depois, é uma conversa separada.

## Detalhes técnicos
- Reaproveita o que já existe: `gerarDanfePdf` (DANFE), `ProxyProvider.cancelar` e `cartaCorrecao` (eventos SEFAZ), `prepararNotasBagy`/`transmitirNotaBagy`.
- Envio de e-mail: nova ação na edge function `nfe-proxy` (ou função `nfe-enviar-email`) que gera o PDF no servidor e dispara pelo e-mail configurado; precisa confirmar qual serviço de e-mail usar (o portal hoje não envia e-mails — posso usar o serviço padrão do Lovable Cloud).
- WhatsApp: link `wa.me` com mensagem pronta (sem envio automático).
- Cancelamento e carta de correção já existem no provider e gravam em `nfe_eventos`; o menu só os expõe com janelas de confirmação.
- Excluir rascunho: delete em `nfe_notas`/`nfe_itens` apenas quando status ≠ autorizada (regra já protegida por RLS de admin_master).
- Sem mudanças no banco de dados nesta etapa (e-mail pode exigir apenas configuração de segredo).

## Validação
- Typecheck + build.
- Teste visual do menu em pedido sem nota, com nota autorizada e cancelada.
