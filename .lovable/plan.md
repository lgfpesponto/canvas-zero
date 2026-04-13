
Objetivo: fazer a ficha de produção da Bota respeitar a hierarquia real Categoria → Campo → Variação, porque hoje o sistema da Bota ainda está modelado como “categoria técnica → variações”, e por isso o “+ campo” cria variações em vez de campos.

Diagnóstico confirmado
- A ficha `bota` no banco está como `tipo_ficha = 'classica'`.
- A tabela `ficha_campos` da Bota está vazia.
- O botão `+ campo` em `src/pages/AdminConfigFichaPage.tsx` chama `handleAddItem()` e insere em `ficha_variacoes`, então ele cria variações, não campos.
- A reordenação atual dos itens também está errada para esse caso: o modal ordena alfabeticamente antes do swap, então a troca por `ordem` não reflete bem na tela.
- Hoje as “categorias” do banco da Bota são técnicas e não batem com as categorias visuais que você definiu. As atuais são:
  `modelos, cores-couro, bordados-cano, bordados-gaspea, bordados-taloneira, solados, acessorios, cor-glitter, cor-linha, cor-sola, cor-vira, formato-bico, desenvolvimento, carimbo, area-metal, cor-borrachinha, cor-vivo, tipos-couro, tamanhos, generos, laser-cano, laser-gaspea, laser-taloneira, tipo-metal, cor-metal`
- Bordados e Laser publicados não estão totalmente aqui:
  - `custom_options` tem dados ativos publicados: `bordado_cano 58`, `bordado_gaspea 47`, `bordado_taloneira 24`, `laser_cano 22`, `laser_gaspea 23`, `laser_taloneira 23`
  - já em `ficha_variacoes`, a Bota tem bordados parciais e os lasers estão zerados.

Estrutura alvo no banco
```text
Categoria visual
  └── Campo
        └── Variações (quando o campo for seleção/múltipla)
```

Categorias finais da Bota no banco
- Identificação
- Tamanho / Gênero / Modelo
- Sob Medida
- Acessórios
- Couros
- Desenvolvimento
- Bordados
- Laser
- Estampa
- Pesponto
- Metais
- Extras
- Solados
- Carimbo a Fogo
- Adicional
- Observação

Regra importante
- “Nome Bordado” deixa de ser categoria e vira campo dentro de “Bordados”, abaixo dos demais campos.

Plano de implementação

1. Ajustar o modelo do banco
- Adicionar `categoria_id` em `ficha_campos`, para cada campo pertencer a uma categoria visual.
- Adicionar `campo_id` em `ficha_variacoes`, para cada variação pertencer a um campo específico.
- Adicionar metadados mínimos em `ficha_campos` para representar os casos reais da Bota:
  - tipos: `texto`, `numero`, `selecao`, `multipla`, `checkbox`, `textarea`
  - preço base para campos tipo “tem/não tem”
  - config extra quando necessário
- Manter compatibilidade com o que já existe, para não quebrar o resto do sistema durante a transição.

2. Reorganizar os dados da Bota
- Transformar as categorias técnicas atuais em campos dentro das categorias visuais.
- Criar os campos reais da Bota no banco, por exemplo:
  - `Tamanho / Gênero / Modelo` → campos `Tamanho`, `Gênero`, `Modelo`
  - `Acessórios` → campo `Acessórios`
  - `Bordados` → `Bordado do Cano`, `Cor do Bordado do Cano`, `Bordado da Gáspea`, `Cor...`, `Bordado da Taloneira`, `Cor...`, `Nome Bordado`
  - `Extras` → `Tricê`, `Tiras`, `Franja`, `Corrente` e seus campos dependentes de descrição
  - `Adicional` → campo numérico de valor + campo de texto
- Migrar as opções existentes para `ficha_variacoes` no campo correto.
- Importar para a Bota tudo que está publicado em `custom_options` para bordados e laser, sem perder preço nem duplicar item já existente.

3. Refatorar a tela de Configurações da Bota
- Trocar o editor hardcoded atual por um editor orientado a:
  - categoria visual
  - campos daquela categoria
  - variações daquele campo
- O botão `+ categoria` passará a criar categoria visual real.
- O botão `+ campo` passará a:
  - puxar sempre as categorias reais da ficha
  - criar um registro em `ficha_campos`
  - não criar mais `ficha_variacoes`
- As variações passarão a ser adicionadas dentro do campo correto, não diretamente na categoria.

4. Corrigir reordenação
- Permitir mover campos dentro da categoria usando `ordem` em `ficha_campos`.
- Permitir mover variações dentro do campo usando `ordem` em `ficha_variacoes`.
- Remover a ordenação alfabética que hoje interfere na reordenação manual.

5. Sincronizar com a ficha publicada
- Fazer a Bota administrativa puxar bordados e lasers já publicados.
- Corrigir a leitura de laser para não depender de categoria errada.
- Atualizar os helpers que hoje leem parcialmente `custom_options` e parcialmente `ficha_variacoes`, para a origem canônica ficar consistente.

Arquivos/tabelas envolvidos
- Banco:
  - `ficha_categorias`
  - `ficha_campos`
  - `ficha_variacoes`
  - leitura/migração de `custom_options`
- Frontend:
  - `src/pages/AdminConfigFichaPage.tsx`
  - `src/hooks/useAdminConfig.ts`
  - `src/hooks/useFichaVariacoesLookup.ts`
  - `src/pages/OrderPage.tsx`
  - `src/pages/EditOrderPage.tsx`

Resultado esperado
- O banco passa a refletir a formulação real da ficha.
- “+ campo” cria campo de verdade.
- Cada campo fica dentro da sua categoria.
- Variações ficam dentro do campo correto.
- “Nome Bordado” fica dentro de “Bordados”.
- É possível mover campos dentro das categorias.
- Bordados e lasers publicados aparecem também na configuração da Bota.
