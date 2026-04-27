# Adicionar faixas de categoria na página de detalhes do pedido

## Objetivo
Inserir faixas horizontais laranja terracota com o nome da categoria centralizado em branco minúsculo (igual à imagem de referência) entre os blocos de campos da ficha — para que a leitura visual fique organizada por seção em vez de uma lista plana de pares "label / valor".

## Onde
**Arquivo único:** `src/pages/OrderDetailPage.tsx`

Atualmente os campos são renderizados em um grid de 2 colunas como uma única lista plana (`details.map(...)` na linha 562). Vou agrupar esses pares em **categorias lógicas** e renderizar uma faixa de cabeçalho antes de cada grupo que tenha pelo menos 1 campo preenchido.

## Categorias propostas (ficha de Bota)

| Faixa | Campos incluídos |
|---|---|
| **identificação** | Modelo, Cliente, Tamanho, Sob Medida, Acessórios |
| **couro** | Tipo Couro Cano/Gáspea/Taloneira, Cor Couro Cano/Gáspea/Taloneira, Desenvolvimento |
| **bordado** | Bordado Cano/Gáspea/Taloneira, Cor Bordado, Nome Bordado |
| **laser** | Laser Cano/Gáspea/Taloneira, Cor Glitter/Tecido |
| **acabamento** | Pintura, Estampa, Cor da Linha, Cor Borrachinha, Cor do Vivo |
| **metais** | Área Metal, Tipo Metal, Cor Metal, Strass, Cruz, Bridão, Cavalo, Bola Grande |
| **complementos** | Tricê, Tiras, Franja, Corrente |
| **solado** | Solado, Formato do Bico, Cor da Sola, Cor da Vira, Costura Atrás |
| **finalização** | Carimbo a Fogo, Adicional |

## Categorias propostas (ficha de Cinto e demais Extras)
Os pedidos com `tipoExtra` usam um caminho de render diferente (linhas 545-558). Para o cinto, agruparemos os campos do `EXTRA_DETAIL_LABELS` em:

| Faixa | Campos |
|---|---|
| **identificação** | Tamanho, Cliente |
| **couro** | Tipo de Couro, Cor do Couro |
| **fivela** | Fivela |
| **bordado** | Bordado P, Nome Bordado |
| **finalização** | Carimbo a Fogo, Adicional |

Para os demais extras (Kit Faca, Tiras Laterais, Revitalizador, Bota Pronta Entrega múltipla) mantemos o comportamento atual sem faixas, pois são listas curtas — exceto se quiser estender depois.

## Mudança técnica

1. Substituir o array plano `details: [string, string][]` por uma estrutura agrupada:
   ```ts
   const detailsGrouped: { categoria: string; itens: [string, string][] }[] = [
     { categoria: 'identificação', itens: [['Modelo', order.modelo], ...] },
     { categoria: 'couro', itens: [['Tipo Couro Cano', order.couroCano], ...] },
     // ...
   ].map(g => ({ ...g, itens: g.itens.filter(([, v]) => v) }))
    .filter(g => g.itens.length > 0);
   ```

2. No render (linha 561), substituir o `.map` plano por:
   ```tsx
   <div className="mb-6 space-y-4">
     {detailsGrouped.map(grupo => (
       <div key={grupo.categoria}>
         <div className="bg-[#C95A11] text-white text-center text-sm lowercase py-1.5 rounded-sm mb-2">
           {grupo.categoria}
         </div>
         <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 px-1">
           {grupo.itens.map(([label, value]) => (
             <div key={label} className="flex justify-between py-1.5 border-b border-border/50">
               <span className="text-sm text-muted-foreground">{label}</span>
               <span className="text-sm font-semibold text-right max-w-[60%]">{value}</span>
             </div>
           ))}
         </div>
       </div>
     ))}
   </div>
   ```

3. Aplicar a mesma estrutura agrupada para o ramo do cinto (linhas 545-558), construindo `cintoGrouped` a partir de `order.extraDetalhes`.

## Detalhes visuais da faixa
- Cor de fundo: `#C95A11` (laranja terracota da imagem)
- Texto: branco, minúsculo, centralizado, fonte normal (não bold)
- Padding vertical: `py-1.5`
- Cantos levemente arredondados: `rounded-sm`
- Largura total do bloco (atravessa as 2 colunas do grid)

## Fora de escopo
- **Não** vou alterar os PDFs de relatório (Forro, Corte, Bordados, etc.) — você pediu só a tela de detalhes.
- **Não** vou alterar o formulário de criação/edição (OrderPage / BeltOrderPage).
- **Não** vou alterar o cálculo de preço, ordenação de campos nem a lógica de quais campos aparecem.
- Nenhuma mudança no banco de dados.

## Resultado esperado
Ao abrir um pedido (bota ou cinto) na página de detalhes, em vez de uma lista corrida de 30+ linhas, o admin/vendedor verá blocos visualmente separados por faixas laranja com os nomes "couro", "bordado", "metais", etc. — exatamente como a imagem de referência mostra para "couro".
