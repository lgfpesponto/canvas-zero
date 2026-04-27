# Faixas de categoria nas fichas + painel lateral de foto + agrupamento em "Meus Pedidos"

## Objetivos
1. **`OrderDetailPage` (Meus Pedidos / detalhes)** — voltar ao layout agrupado com faixas laranjas (igual print já aprovado), garantindo que o nome correto de cada campo seja exibido (ex.: "Pesponto" não pode virar "Acabamento").
2. **`OrderPage` (Faça seu Pedido — Bota)** e **`BeltOrderPage` (Faça seu Pedido — Cinto)** — adicionar uma faixa **IDENTIFICAÇÃO** englobando os campos básicos, mover o **link da foto** para o topo da ficha (logo após "IDENTIFICAÇÃO") e mostrar a foto num **painel lateral** (igual ao usado em `OrderDetailPage` via `FotoPedidoSidePanel`) assim que um link válido for colado.
3. Manter a **ordem atual dos campos obrigatórios → opcionais** dentro de cada categoria (sem reordenar lógica de cálculo).

---

## 1. `src/pages/OrderDetailPage.tsx` — restaurar faixas + corrigir nomes

### a) Restaurar `detailsGrouped` (apenas Bota)
Substituir o render plano `details.map(...)` por grupos com faixa laranja. Cada grupo só aparece se tiver algum campo preenchido.

Estrutura proposta (usa **labels reais já existentes** no `details` flat — não inventa "Acabamento", "Identificação técnica" etc.):

```ts
const detailsGrouped: { categoria: string; itens: [string, string][] }[] = [
  {
    categoria: 'identificação',
    itens: ([
      ['Vendedor', order.vendedor],
      ['Número do Pedido', order.numeroPedido],
      ...(showCliente && order.cliente ? [['Cliente', order.cliente]] as [string,string][] : []),
      ['Tamanho', order.tamanho ? `${order.tamanho}${order.genero ? ' — ' + order.genero : ''}` : ''],
      ['Modelo', order.modelo],
      ['Sob Medida', order.sobMedida ? `Sim${order.sobMedidaDesc ? ' — ' + order.sobMedidaDesc : ''}` : ''],
      ['Desenvolvimento', order.desenvolvimento],
      ['Acessórios', order.acessorios],
    ] as [string,string][]).filter(([, v]) => v),
  },
  { categoria: 'couro', itens: filtered([
      ['Tipo Couro Cano', order.couroCano],
      ['Cor Couro Cano', order.corCouroCano],
      ['Tipo Couro Gáspea', order.couroGaspea],
      ['Cor Couro Gáspea', order.corCouroGaspea],
      ['Tipo Couro Taloneira', order.couroTaloneira],
      ['Cor Couro Taloneira', order.corCouroTaloneira],
  ]) },
  { categoria: 'bordado', itens: filtered([
      ['Bordado Cano', order.bordadoCano],
      ['Cor Bordado Cano', order.corBordadoCano],
      ['Bordado Gáspea', order.bordadoGaspea],
      ['Cor Bordado Gáspea', order.corBordadoGaspea],
      ['Bordado Taloneira', order.bordadoTaloneira],
      ['Cor Bordado Taloneira', order.corBordadoTaloneira],
      ['Nome Bordado', order.nomeBordadoDesc || order.personalizacaoNome || ''],
  ]) },
  { categoria: 'laser', itens: filtered([
      ['Laser Cano', order.laserCano],
      ['Cor Glitter/Tecido Cano', order.corGlitterCano],
      ['Laser Gáspea', order.laserGaspea],
      ['Cor Glitter/Tecido Gáspea', order.corGlitterGaspea],
      ['Laser Taloneira', order.laserTaloneira],
      ['Cor Glitter/Tecido Taloneira', order.corGlitterTaloneira],
      ['Pintura', order.pintura === 'Sim' ? (order.pinturaDesc || 'Sim') : ''],
      ['Estampa', order.estampa === 'Sim' ? (order.estampaDesc ? `Sim — ${order.estampaDesc}` : 'Sim') : ''],
  ]) },
  { categoria: 'pesponto', itens: filtered([   // ← nome correto, NÃO "acabamento"
      ['Cor da Linha', order.corLinha],
      ['Cor Borrachinha', order.corBorrachinha],
      ['Cor do Vivo', order.corVivo],
  ]) },
  { categoria: 'metais', itens: filtered([
      ['Área Metal', order.metais],
      ['Tipo Metal', order.tipoMetal],
      ['Cor Metal', order.corMetal],
      ['Strass', order.strassQtd ? `${order.strassQtd} un.` : ''],
      ['Bola Grande', detP.bolaGrandeQtd ? `${detP.bolaGrandeQtd} un.` : ''],
      ['Cruz (metal)', order.cruzMetalQtd ? `${order.cruzMetalQtd} un.` : ''],
      ['Bridão (metal)', order.bridaoMetalQtd ? `${order.bridaoMetalQtd} un.` : ''],
      ['Cavalo (metal)', detP.cavaloMetal ? `${detP.cavaloMetalQtd || 0} un.` : ''],
  ]) },
  { categoria: 'extras', itens: filtered([
      ['Tricê', order.trisce === 'Sim' ? (order.triceDesc || 'Sim') : ''],
      ['Tiras', order.tiras === 'Sim' ? (order.tirasDesc || 'Sim') : ''],
      ['Franja', detP.franja ? [detP.franjaCouro, detP.franjaCor].filter(Boolean).join(' — ') || 'Sim' : ''],
      ['Corrente', detP.corrente ? (detP.correnteCor || 'Sim') : ''],
  ]) },
  { categoria: 'solado', itens: filtered([
      ['Solado', order.solado],
      ['Formato do Bico', order.formatoBico],
      ['Cor da Sola', order.corSola],
      ['Cor da Vira', (order.corVira && !VIRA_HIDDEN.includes(order.corVira)) ? order.corVira : ''],
      ['Costura Atrás', order.costuraAtras === 'Sim' ? 'Sim' : ''],
  ]) },
  { categoria: 'finalização', itens: filtered([
      ['Carimbo a Fogo', order.carimbo ? `${order.carimbo}${order.carimboDesc ? ' — ' + order.carimboDesc : ''}` : ''],
      ['Adicional', order.adicionalDesc ? `${order.adicionalDesc}${order.adicionalValor ? ` — ${formatCurrency(order.adicionalValor)}` : ''}` : ''],
  ]) },
].filter(g => g.itens.length > 0);
```

Render (substitui o bloco plano):

```tsx
<div className="mb-6 space-y-5">
  {detailsGrouped.map(grupo => (
    <div key={grupo.categoria}>
      <h3 className="bg-primary text-primary-foreground text-center font-display font-bold text-base uppercase tracking-wide py-1.5 rounded-sm mb-2">
        {grupo.categoria}
      </h3>
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

### b) Agrupamento equivalente para extras (cinto + outros)
Para `tipoExtra === 'cinto'` montar `extraGrouped` com `identificação / couro / fivela / bordado / finalização`.
Para os demais extras manter o render plano de `extraDetails` (sem faixas — pouca informação) **exceto** colocar uma única faixa "identificação" no topo com Vendedor + Nº do Pedido + Cliente + Quantidade.

### c) Garantia anti-bug
- Nenhum label sofrerá renomeação: o array sempre passa o **rótulo real** (`'Pesponto'`, `'Cor da Linha'` etc.). A "categoria" é só a faixa visual; os campos abaixo continuam mostrando o label original.

---

## 2. `src/pages/OrderPage.tsx` — Faça seu Pedido — Bota

### a) Nova faixa **IDENTIFICAÇÃO** no topo
Envolver os blocos `Vendedor + Número + Cliente` (linhas 1095-1121), `Tamanho/Gênero/Modelo` (1123-1152), `Sob Medida` (1155), `Desenvolvimento` (1173) e `Acessórios` (1158) dentro de `<Section title="Identificação">…</Section>`.

Ordenação dentro da seção (obrigatórios primeiro):
1. Vendedor + Número do Pedido + Cliente
2. Tamanho + Gênero + Modelo
3. Sob Medida
4. Desenvolvimento
5. Acessórios

### b) Mover o **link da foto** para o topo (logo após Identificação ou dentro dela)
- Recortar o bloco `Link da Foto de Referência` (linhas 1359-1383) e reposicionar **dentro da seção Identificação**, abaixo de Cliente.
- Manter `<input type="url">` + botão `X`.
- Adicionar botão **"Ver foto"** (idêntico em estilo ao `Eye` já usado no botão de espelho) que aparece somente se `fotoUrl` for um link Drive/HTTP válido (`isHttpUrl(fotoUrl)`), ao clicar abre o painel lateral.

### c) Painel lateral com a foto
Reutilizar `FotoPedidoSidePanel` (`src/components/FotoPedidoSidePanel.tsx`) — já trata Drive/iframe/fallback.

Mudanças no layout do container do form:
```tsx
const showFotoPanel = mostrarFotoPainel && isHttpUrl(fotoUrl);

return (
  <div className={`container mx-auto px-4 py-8 ${showFotoPanel ? 'max-w-6xl' : 'max-w-4xl'} transition-[max-width] duration-300`}>
    <div className={showFotoPanel ? 'grid lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start' : ''}>
      <motion.div ...>
        {/* form atual */}
      </motion.div>
      {showFotoPanel && (
        <FotoPedidoSidePanel url={fotoUrl} onClose={() => setMostrarFotoPainel(false)} />
      )}
    </div>
  </div>
);
```

Estado novo: `const [mostrarFotoPainel, setMostrarFotoPainel] = useState(false);`

### d) Demais seções existentes
**Não mexer** nas seções `Couros`, `Bordados`, `Laser`, `Pesponto`, `Metais`, `Extras`, `Solados`, `Carimbo a Fogo`, `Adicional`. As faixas laranjas dessas categorias **já estão aplicadas** (componente `Section`) e seguem com o nome correto. Apenas confirmar que continuam após Identificação na ordem atual.

---

## 3. `src/pages/BeltOrderPage.tsx` — Faça seu Pedido — Cinto

### a) Faixa **IDENTIFICAÇÃO**
Envolver `Vendedor + Número + Cliente` (linhas 311-335) e `Tamanho` (337-346) em `<Section title="Identificação">`.

### b) Link de foto + Ver foto + painel lateral
- Mover o bloco `Link da Foto de Referência` (linhas 467-479) para dentro da seção Identificação (logo após Cliente).
- Adicionar botão "Ver foto" + `FotoPedidoSidePanel` exatamente como na Bota.
- Mesma estrutura de container `max-w-6xl` + grid lateral.

### c) Demais seções (`Couro`, `Fivela`, `Bordado P`, `Nome Bordado`, `Carimbo a Fogo`, `Adicional`) permanecem como estão (já têm faixas laranjas via `Section`).

---

## 4. Estilo da faixa
Reutilizar exatamente o componente `Section` já presente em ambas as fichas:

```tsx
<h3 className="bg-primary text-primary-foreground text-center font-display font-bold text-lg uppercase tracking-wide py-2 rounded-sm">
  {title}
</h3>
```

Para `OrderDetailPage` usar uma versão um pouco menor (`text-base`, `py-1.5`) para combinar com a densidade da página de detalhes.

---

## Fora do escopo
- Não alterar PDFs, OrderCard ("Meus Pedidos" listagem), formulários de Extras (Kit Faca etc.).
- Não alterar cálculo de preços, ordenação interna dos selects, validações ou banco.
- Não renomear nenhum campo/label — só a categoria visual da faixa muda.

## Resultado esperado
- **Bota e Cinto**: ao abrir "Faça seu Pedido", a primeira faixa é **IDENTIFICAÇÃO** contendo vendedor, nº do pedido, cliente, tamanho/gênero/modelo (bota), sob medida, desenvolvimento, acessórios e o **link do Drive**. Assim que um link válido é colado, o botão **"Ver foto"** aparece e abre o painel lateral direito mostrando a imagem (igual à tela de detalhes), sem bloquear a edição.
- **Detalhes do Pedido (Meus Pedidos)**: volta ao layout em blocos com faixa laranja por categoria (identificação, couro, bordado, laser, **pesponto**, metais, extras, solado, finalização) — com os nomes reais dos campos preservados.
