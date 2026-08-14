# Congelar as regras da ficha como nova versão

## Situação atual (verificada)

- `ficha_versoes` guarda apenas **dados** da ficha: categorias, campos, variações e prazo (`src/lib/fichaVersoes.ts`, `buildSnapshotAtual`).
- As mudanças recentes (navegação por Enter, sugestões de cor, menu/atalhos, cabeçalho, campos de quantidade vazios, fluxo dos Metais) estão no **código** (`src/pages/OrderPage.tsx`, `src/lib/fichaNav.ts`, `src/hooks/useFichaKeyboardNav.ts`, `src/lib/corSugestoes.ts`, componentes em `src/components/ficha/`), não no snapshot.
- Portanto, salvar versão no modo edição ou reverter uma versão antiga **não desfaz** as regras/formato — só mexe em variações/campos. Hoje isso não está escrito em lugar nenhum, e é justamente o que gera a dúvida.

## O que será feito

### 1. Registrar a nova versão da ficha (bota)
Criar uma nova versão ativa a partir do estado atual, com descrição:
"Nova ficha: navegação por Enter campo a campo, sugestões de cor (linha/borrachinha/vivo e cores de bordado/laser/recorte), menu de categorias + atalhos flutuantes, cabeçalho e numeração automática, fluxo de Metais, campos de quantidade vazios."

Assim fica um marco no Histórico de Fichas, e os pedidos novos apontam para essa versão.

### 2. Documentar as regras para não regredirem
Registrar em `docs/BUSINESS_RULES.md` (e na memória do projeto) o bloco "Ficha atual — regras de preenchimento", listando as regras de Enter, sugestões de cor, atalhos e layout, marcadas como regras de código independentes das versões de dados. Nenhum aviso novo no portal.

## Técnico

- Nova linha em `ficha_versoes` para o tipo `bota` (snapshot atual + `ativa = true`), via a rotina já existente `salvarNovaVersao`.
- Nenhuma mudança de interface.
- Sem mudanças em preços, variações existentes ou pedidos.
