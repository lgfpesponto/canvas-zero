

## Plano: Validação de variações ao carregar modelo

### Problema
Quando um modelo (template) é carregado via "Preencher" ou "Editar", valores salvos que foram renomeados ou removidos da ficha são preenchidos silenciosamente — o campo fica com um valor "fantasma" que não existe mais nas opções disponíveis.

### Escopo
- Variações novas já aparecem naturalmente nos dropdowns (são populados do banco em tempo real). O modelo apenas pré-seleciona valores salvos — não interfere nas opções disponíveis.
- O problema está apenas em valores salvos que não existem mais.

### Alterações

#### Arquivo: `src/pages/OrderPage.tsx`

1. **Criar função `validateTemplateData`** que recebe o `form_data` do template e compara cada campo de seleção contra as opções atuais disponíveis:
   - Campos simples (modelo, solado, formatoBico, corSola, corVira, tipoCouroCano/Gaspea/Taloneira, corCouroCano/Gaspea/Taloneira, corLinha, corBorrachinha, etc.) → verificar se o valor salvo existe nas opções atuais
   - Campos multi-select (bordadoCano, bordadoGaspea, bordadoTaloneira, laserCano, laserGaspea, laserTaloneira, tipoMetal, acessorios) → filtrar apenas os valores que ainda existem, coletar os removidos

2. **Mostrar toast de aviso** listando os campos com valores removidos/renomeados, ex: `"Modelo 'X' não existe mais na ficha. Bordado Cano: 'Y' foi removido."`

3. **Limpar campos inválidos** automaticamente (setar como vazio ou filtrar do array) para evitar valores fantasma

4. **Integrar validação** em `handleUseTemplate` e `handleEditTemplate`, chamando `validateTemplateData` antes de `populateFormFromTemplate`

#### Arquivo: `src/pages/EditOrderPage.tsx`
- Mesma lógica se templates forem usados lá (verificar se aplica)

### O que NÃO muda
- Layout, fluxo, preços, opções dos dropdowns
- Variações novas continuam aparecendo normalmente nos selects
- Templates salvos no banco não são alterados — a validação é apenas na leitura

