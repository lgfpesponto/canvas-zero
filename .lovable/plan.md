## Esconder "Usuários" e "Configurações" do header para admin_producao

Em `src/components/Header.tsx`:
- Linha 63: adicionar `role !== 'admin_producao'` para não mostrar `USUÁRIOS` para Fernanda/Mariana.
- Linha 64: adicionar `role !== 'admin_producao'` para não mostrar o menu `CONFIGURAÇÕES` (com todas as sub-abas).

Resultado: admin_producao continua com acesso a Faça seu pedido, Modelos, Extras, Estoque, Meus Pedidos, Pedidos Bagy (se aplicável) e Meu Perfil — sem Usuários nem Configurações.

Rotas em si (`/usuarios`, `/admin/configuracoes`) não são alteradas nesta task; só o menu.
