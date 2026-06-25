# Phase 4 — Correção: Nome do produto vem do template (Modelos Salvos), não da variação Modelo

## O que mudar

Hoje (errado): quando o vendedor é **Estoque**, o campo *Nome do produto* é auto-preenchido com a **variação Modelo** da ficha (ex.: "Bota Feminino"). 

Correto: deve ser preenchido com o **nome do Modelo Salvo** (template), que é o título mostrado em "Modelos Salvos" (ex.: "Florência Horse Preto e Bege", "LARA HORSE NESCAU MARROM"). Continua **editável**.

## Arquivo: `src/pages/OrderPage.tsx`

1. **Remover auto-fill via Modelo:**
   - Apagar o `useEffect` das linhas 289–295 que copia `modelo → nomeProdutoEstoque`.
   - Em `handleModeloChange` (linhas 319–324), remover o bloco que seta `nomeProdutoEstoque` a partir de `newModelo`.

2. **Preencher a partir do template salvo:**
   - Mudar a assinatura de `handleUseTemplate` para receber `(formData, templateNome)`.
   - Mudar `handleEditTemplate` para também propagar `template.nome`.
   - Dentro de ambos, após `validateAndPopulateTemplate`, se `vendedorSelecionado === 'Estoque'` (ou se o `formData.vendedorSelecionado === 'Estoque'`), setar:
     ```ts
     setNomeProdutoEstoque(prev => prev.trim() ? prev : templateNome);
     ```
     (não sobrescreve se usuário já digitou algo).
   - Nos botões "Preencher" (linha 1728) e "Editar" (handleEditTemplate uso na lista), passar `t.nome`.

3. **Cobrir caminho de "envio entre usuários" / `templateInit`:**
   - Em `templateInit` (linha 149), o objeto vem com `nome` do template (verificar shape). Adicionar um `useEffect` único no mount: se `vendedorSelecionado === 'Estoque'` e `nomeProdutoEstoque` vazio e `templateInit?.__templateNome` (ou `templateInit?.nome`) preenchido → setar. Se o shape não tiver o nome, propagar via `locState.templateNome` quando navegar.

## Comportamento resultante

- Abrir ficha vazia + escolher Modelo "Bota Feminino" → *Nome do produto* permanece **vazio**.
- Clicar "Preencher" no template "Florência Horse Preto e Bege" → *Nome do produto* fica `Florência Horse Preto e Bege`.
- Usuário pode editar a qualquer momento.
- Sugestão de SKU (Phase 4 anterior) continua: usa `slug(nomeProdutoEstoque)` → fallback `slug(modelo)`; lookup em `estoque_produtos` por nome continua igual.

## Fora do escopo
- Não muda `GradeEstoque`, `EstoqueAdminPanel`, nem migrations.
- Não muda o fluxo de cinto.

Confirma para implementar?
