# Ocultar Cliente/WhatsApp para os vendedores

O código já esconde os campos "Cliente" e "WhatsApp do Cliente" em todas as telas citadas (Modelos, Extras, Estoque, Faça seu Pedido, Cinto), mas só quando o usuário tem o papel `vendedor`.

Consulta ao banco mostra a causa real: esses usuários estão **sem papel nenhum** cadastrado:

| Usuário | Papel atual |
|---|---|
| gabi (Maria Gabriela) | nenhum |
| fabi (Fabiana Silva) | nenhum |
| samuel (Samuel Silva Plácido) | nenhum |
| rafa (Rafael Silva) | nenhum |
| denise (Denise Garcia Feliciano) | nenhum |
| larissa (Larissa Silva) | nenhum |
| mari (Mariana Ribeiro) | vendedor (já correto) |

Sem papel, o portal não os reconhece como vendedores — por isso os campos continuam aparecendo (e outras regras de vendedor também não se aplicam a eles).

## O que será feito

1. **Atribuir o papel `vendedor`** a gabi, fabi, samuel, rafa, denise e larissa (migração no banco). Mariana Ribeiro (`mari`) já está correta; "Mariana ADM" continua como admin de produção.
2. **Rede de segurança no portal**: tratar usuário **sem papel definido** como vendedor comum para efeito de ocultar Cliente/WhatsApp, nas telas Modelos, Extras, Estoque (comprar), Faça seu Pedido (bota) e Cinto. Assim, se um usuário novo for criado sem papel, os campos já nascem ocultos.

## Efeito colateral esperado

Com o papel `vendedor` aplicado, esses usuários passam a seguir também as demais regras de vendedor comum já existentes (numeração automática por prefixo, quando o admin master cadastrar o prefixo de cada um em Usuários). Enquanto o prefixo estiver vazio, a numeração segue manual como hoje.

## Detalhes técnicos

- Migração: `INSERT INTO public.user_roles (user_id, role) SELECT id, 'vendedor' FROM public.profiles WHERE nome_usuario IN (...) ON CONFLICT DO NOTHING`.
- Frontend: em `OrderPage.tsx`, `BeltOrderPage.tsx`, `ExtrasPage.tsx`, `DynamicOrderPage.tsx`, `ModelosPage.tsx` e `EstoqueBuyDialog.tsx`, trocar `role === 'vendedor'` por `role === 'vendedor' || !role` (usuário autenticado sem papel).
