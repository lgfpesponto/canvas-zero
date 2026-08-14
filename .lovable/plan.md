# Ficha da bota: navegação por Enter, sugestões e atalhos

Escopo: página "Faça seu Pedido" da bota (`/pedido`), sem alterar regras de cálculo/soma de preço. Cinto e extras ficam como estão.

## 1. Navegação sequencial com Enter

- Ao abrir a ficha, o campo "Link da Foto de Referência" já vem focado.
- Enter em qualquer campo avança para o próximo campo da ficha, na ordem visual.
- Campos de seleção (couros, solado, cores...): ao receber o foco pelo Enter, a lista de variações já abre com a busca pronta. Escolher com o mouse ou clicar fora conta como Enter e avança.
- Campos "Tem / Não tem": Enter abre as opções, Enter de novo confirma a opção destacada e avança. Se marcar "Tem" e existir campo de descrição, o Enter leva para a descrição.
- Campos de múltipla seleção (Bordado do Cano, Laser...): o Enter do campo anterior cai direto no campo de busca. Depois de marcar o que quiser, Enter avança para o próximo campo.
- Acessórios: o Enter percorre acessório por acessório; Enter marca, seta para o lado pula sem marcar; no último acessório desce para os campos seguintes.

## 2. Sugestões automáticas de cor

Todas seguem a cor do couro do cano, aparecem no topo da lista de variações com a etiqueta "sugerido", e não bloqueiam a escolha de outra opção.

- **Cor da Linha**: marrom / nescau / chocolate → café; preto e malhado → preto; branco / off white → branco; demais cores → a cor equivalente do couro.
- **Cor da Borrachinha**: preto → preto; branca / off white → branca; rosa → rosa; laranja → laranja; demais → marrom.
- **Cor do Vivo**: branca / off white → branca; rosa → rosa; laranja → laranja; azul → azul; demais → preto (branco como segunda sugestão).
- **Cor do Bordado (Gáspea / Taloneira)**: pré-preenchidas com o mesmo texto de "Cor do Bordado do Cano", marcadas como "sugestão", e só quando aquela parte tiver bordado selecionado.

## 3. Campos condicionais e obrigatoriedade

Obrigatório só quando a condição foi atendida — nunca de forma geral.

- "Cor do Bordado (Cano/Gáspea/Taloneira)" só aparece se houver bordado selecionado naquela parte, e nesse caso é obrigatória.
- Mesma regra para a cor do bordado da categoria Laser: aparece e é obrigatória apenas se houver laser naquela parte.
- Cor do recorte: aparece e é obrigatória apenas se houver recorte naquela parte.
- Todo campo "Tem" que abre descrição passa a exigir a descrição.
- Metais: se "Área do Metal" for "Inteira" ou "Metade", tipo do metal e cor do metal viram obrigatórios. Metais cobrados por quantidade: marcar "tem" obriga informar a quantidade.
- Carimbo a Fogo: escolher "até 3 carimbos" ou "até 6 carimbos" torna "quais carimbos e onde" obrigatório.

## 4. Reorganização de campos

- "Nome Bordado" passa a ficar logo abaixo de "Desenvolvimento", antes de "Bordado do Cano". Só muda a posição visual; a soma continua igual.
- A categoria "Laser e Recortes" passa a se chamar **"Laser"**.
- Nova categoria **"Recortes"** logo abaixo, recebendo Recorte do Cano / Gáspea / Taloneira e suas cores.
- Categoria "Metais": nova variação **"Não tem"** na Área do Metal. Com Enter: "Não tem" segue para o próximo metal; "Inteira" ou "Metade" pré-preenche o rebite e abre a cor do metal.

## 5. Atalhos de teclado

| Atalho | Ação |
|---|---|
| Ctrl + S | Conferir e finalizar pedido |
| Ctrl + R | Salvar rascunho |
| Ctrl + L | Limpar tudo |
| Ctrl + E | Criar estoque direto (admin master e admin produção) |
| Ctrl + X | Expandir (com o campo de busca da múltipla seleção focado) |
| Ctrl + M | Ir para o menu de categorias |

Os atalhos ficam listados em um painel explicativo fora da ficha, sempre visível.

## 6. Menu lateral de categorias

Menu fixo à esquerda da ficha com todas as categorias; clicar rola a página até a seção correspondente (para cima ou para baixo). Ctrl + M leva o foco ao menu. Em telas pequenas o menu vira uma barra recolhível para não atrapalhar.

## 7. Nova versão da ficha

Ao final, registrar uma nova versão da ficha da bota (snapshot ativo em `ficha_versoes`) com a descrição das mudanças, para que os pedidos novos passem a apontar para ela.

## Detalhes técnicos

- Criar `src/hooks/useFichaKeyboardNav.ts`: registra os campos em ordem (ref + tipo), expõe `focusNext()` e trata Enter/click-fora. `SearchableSelect` ganha props opcionais `autoOpenOnFocus`, `onCommit` e ref imperativa; `MultiSelect` e `ToggleField` (em `OrderPage.tsx`) ganham suporte a foco/abertura programática.
- Criar `src/lib/corSugestoes.ts` com os mapas cor-do-couro → cor sugerida (linha, borrachinha, vivo) e função que reordena as opções colocando a sugerida em primeiro com rótulo "sugerido". Aplicada só na ordenação/exibição — nenhum preço muda.
- Ajustes de obrigatoriedade dentro do bloco `required` / `toggleChecks` de `handleSubmit` em `OrderPage.tsx`, sempre condicionados ao campo pai preenchido.
- A variação "Não tem" da Área do Metal é criada em `ficha_variacoes` (preço 0) via migração, com fallback no config caso o registro não exista.
- Atalhos em um listener global montado na página, ignorando quando o foco está em campo de texto para não conflitar com digitação (exceto Ctrl+X no campo de busca).
- Menu de categorias como novo componente `src/components/ficha/FichaCategoriaMenu.tsx` usando `scrollIntoView` nas seções.
- Nova versão gerada com `salvarNovaVersao` de `src/lib/fichaVersoes.ts`.
