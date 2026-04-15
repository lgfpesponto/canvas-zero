

## Plano: Remover botões não utilizados da página de configurações (Ficha Bota)

### Escopo

Remover **apenas** da página `src/pages/AdminConfigFichaPage.tsx` os seguintes botões da barra de ações:

1. **"Criar Modelo"** — não é usado nesta página de configuração
2. **"Modelos"** — não é usado nesta página de configuração
3. **"sincronizar"** — sem função real (apenas invalida cache)

### O que NÃO muda (garantia explícita)

- **Formulário "Faça seu pedido" (OrderPage / DynamicOrderPage)**: botões de Criar Modelo e Modelos permanecem intactos
- **Sistema de templates**: tabela `order_templates`, hooks `useTemplateManagement`, geração de grades — zero alterações
- **Lógica de modelos vs fichas alteradas**: regras de compatibilidade quando a ficha muda após criação do modelo — preservadas
- **Todo o restante da AdminConfigFichaPage**: edição de variações, campos, categorias, reordenação, "Salvar no banco"

### Alteração técnica

**Arquivo**: `src/pages/AdminConfigFichaPage.tsx`

- Remover o bloco condicional `{isBoot && (<>...</>)}` que renderiza os botões "Criar Modelo" e "Modelos" na barra de ações (~linhas 2154-2159)
- Remover o botão "sincronizar" (~linhas 2185-2197)
- Nenhum outro arquivo é tocado

