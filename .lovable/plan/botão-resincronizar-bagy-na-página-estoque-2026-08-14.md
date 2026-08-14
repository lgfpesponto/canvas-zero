# Botão "Resincronizar Bagy" na página Estoque

## Objetivo
Permitir que admin_master, admin_producao e vendedor_comissao forcem uma ressincronização completa de todos os produtos ativos com a Bagy, com feedback visual de carregamento.

## O que será feito

1. **Novo botão "Resincronizar Bagy"** na barra de ações da página Estoque, ao lado do atual "Sincronizar com Bagy (N)".
   - Visível apenas para os três papéis acima (mesma regra `canSeeBagySync` já existente).
   - Sempre visível, mesmo quando não há pendências (diferente do botão atual, que só aparece com pendentes).

2. **Confirmação antes de rodar**: diálogo curto explicando que todos os produtos ativos serão reenviados para a Bagy, para evitar disparo acidental.

3. **Estado de carregamento na tela**: enquanto roda, o botão fica com spinner e texto "Sincronizando...", desabilitado, e aparece um aviso fixo "Carregando sincronização com a Bagy..." sobre a lista, bloqueando novo disparo.

4. **Resultado**: ao terminar, toast com o resumo (quantos SKUs OK / com erro) e atualização dos contadores de pendência/erros.

## Detalhes técnicos
- Novo componente `src/components/estoque/BagyResyncAllButton.tsx`, montado em `src/pages/EstoquePage.tsx` junto ao `BagySyncPendingButton`.
- Chamada: `supabase.functions.invoke('bagy-stock-sync', { body: { force_all_active: true, force_rediscover: true } })` — a função já suporta esses flags e exige papel privilegiado.
- Sem mudanças na edge function, no banco ou na lógica de estoque/preço.
