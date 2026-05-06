# Plano de execução — 3 frentes

## Frente 1 — Eliminar reescritas automáticas de `orders.preco`

Causa-raiz das oscilações de valor: dois pontos reescrevem `preco` no banco em background.

1. **GestaoPage.tsx** — remover render de `<RecalcPrecosRunner />` e qualquer auto-start via `localStorage`.
2. **OrderDetailPage.tsx** (linhas ~107-128) — remover o `update({ preco: precoAlvo })` silencioso ao abrir o pedido. A página apenas exibe; nenhum efeito colateral em banco.
3. **RecalcPrecosRunner.tsx** — remover do bundle (histórico fica no git).
4. Manter `recomputeSubtotal` / `targetPrecoFromSubtotal` em `recomputeOrderPrice.ts` — continuam sendo chamados em **todo create/update** legítimo (form de novo pedido, edição manual, edição de extras), garantindo que o valor salvo já nasce correto.
5. Auditar uma vez todos os `INSERT`/`UPDATE` de `orders` para confirmar que nenhum esquece de chamar `recomputeSubtotal` antes de gravar.

Resultado: o valor salvo é sempre o valor exibido. Nada muda sozinho entre uma sessão e outra.

## Frente 2 — Auditoria global na aba Gestão

1. Criar view `vw_auditoria_alteracoes` em SQL que explode `orders.alteracoes` (jsonb array) em uma linha por alteração, com colunas:
   - `order_id`, `numero`, `vendedor`, `cliente`, `status_atual`
   - `data`, `hora`, `usuario`, `campo`, `valor_anterior`, `valor_novo`, `descricao`
2. Nova aba "Auditoria" em `GestaoPage` (visível só para admin_master) com:
   - Filtros: período (de/até), usuário que alterou, vendedor do pedido, número do pedido, campo alterado
   - Tabela paginada (50 por página) ordenada por data desc
   - Botões: exportar CSV e gerar PDF da página filtrada
3. Eventos adicionais incluídos na mesma view (UNION ALL):
   - `revendedor_saldo_movimentos` (ajustes de saldo, baixas, estornos)
   - `deleted_orders` (exclusões)
   - `system_announcements` (avisos publicados)
   - `historico` de mudanças de status (extraído do `orders.historico`)

## Frente 3 — Assistente IA (admin_master)

Auditoria do `supabase/functions/admin-assistant/index.ts` mostrou tools faltando. Adicionar:

1. **Novas tools**:
   - `buscar_alteracoes_pedido(numero|order_id, periodo?)` — lê `alteracoes` + `historico`
   - `listar_movimentos_saldo(vendedor, periodo?)` — lê `revendedor_saldo_movimentos`
   - `listar_comprovantes(vendedor?, status?, periodo?)`
   - `consultar_preco_vigente(categoria, variacao?)` — lê `ficha_variacoes` + `custom_options` com prioridade correta
   - `listar_usuarios_e_roles()` — lê `profiles` + `user_roles`
   - `consultar_business_rules(topico?)` — lê `docs/BUSINESS_RULES.md` (embutido no prompt do sistema)
   - `pedidos_atrasados(vendedor?, dias?)` — usa `dias_restantes`
   - `auditoria_global(filtros)` — usa a view nova da Frente 2
2. **Limites**: subir corte de retorno de 8.000 → 20.000 chars para tools tabulares.
3. **Erros**: logar stack completo e devolver mensagem instruindo a IA a tentar nova abordagem (não desistir).
4. **System prompt**: incluir resumo de `BUSINESS_RULES.md`, lista atualizada de tools, exemplos ("quem alterou o preço do 23468 hoje?", "qual saldo da Stefany?", "lista pedidos atrasados do Rafael", "qual o preço do bordado X hoje?").
5. **Teste**: rodar as 4 perguntas de exemplo e confirmar respostas corretas antes de fechar.

## Ordem de execução

1. Frente 1 (parar reescritas automáticas) — resolve o sintoma "valor mudando sozinho"
2. Frente 2 (Auditoria global) — substitui a necessidade do Recalculador
3. Frente 3 (Assistente IA) — depende da view criada na Frente 2

## Detalhes técnicos

- Migração SQL: criação da view `vw_auditoria_alteracoes` com `jsonb_array_elements` + UNION ALL dos demais eventos.
- Frontend: nova aba em `src/pages/admin/GestaoPage.tsx` + componente `AuditoriaTab.tsx` + hook `useAuditoria.ts`.
- PDF/CSV: reutilizar `jspdf` + `jspdf-autotable` (já no projeto).
- Edge function: atualizar `supabase/functions/admin-assistant/index.ts` com novas tools, schemas Zod e tratamento de erro.
- Remoções: `src/components/admin/RecalcPrecosRunner.tsx` e referências em `GestaoPage.tsx` + chaves de `localStorage` relacionadas.
