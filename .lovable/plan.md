## Plano — 4 ajustes no fluxo de pedidos

### 1. Contador de selecionados nos quadros de seleção (Bordado, Laser, Acessórios)

**Arquivo**: `src/pages/OrderPage.tsx` — componente `MultiSelect` (linhas 70–117).

No header do quadro (linha 84–86), exibir badge ao lado do label quando `selected.length > 0`:
```tsx
<label className={cls.label + ' mb-0'}>
  {label}
  {selected.length > 0 && (
    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5">
      {selected.length} selecionado{selected.length > 1 ? 's' : ''}
    </span>
  )}
</label>
```

Isso atinge automaticamente todos os MultiSelect: Acessórios, Bordado Cano/Gáspea/Taloneira, Laser Cano/Gáspea/Taloneira.

---

### 2. Pós-finalização: sem redirect, reset do form e toast no canto inferior direito

**Comportamento novo**: ao clicar **OK — FINALIZAR** com sucesso, o usuário **permanece** na mesma página de criação (bota / cinto / extras / dinâmica), o formulário é **zerado** e aparece toast `bottom-right` confirmando o número do pedido.

**Implementação por arquivo**:

#### `src/pages/OrderPage.tsx` (botas)
1. Criar função `resetForm()` que zera **todos** os states do formulário, incluindo:
   - `vendedorSelecionado` → `''` (zerar conforme você confirmou)
   - `numeroPedido`, `cliente`, `tamanho`, `genero`, `modelo`, `sobMedida`, `sobMedidaDesc`
   - `acessorios` `[]`, todos os couros (tipo+cor cano/gáspea/taloneira), `desenvolvimento`
   - todos bordados (arrays + cores + descrições variadas), `nomeBordado`/`nomeBordadoDesc`
   - todos lasers (arrays + cores glitter + cores bordado-laser + textos "outro"), `pintura`/`pinturaDesc`
   - `estampa`/`estampaDesc`, `corLinha`, `corBorrachinha`, `corVivo`
   - todos metais (área, tipo, cor, strass/cruz/bridão/cavalo + qtds)
   - `trice`/`triceDesc`, `tiras`/`tirasDesc`, `franja`/`franjaCouro`/`franjaCor`, `corrente`/`correnteCor`
   - `solado`, `formatoBico`, `corSola`, `corVira`, `costuraAtras`, `carimbo`/`carimboDesc`
   - `adicionalDesc`, `adicionalValor`, `observacao`, `fotoUrl` (zerar conforme confirmado)
   - `gradeItems` `[]`, `showMirror` `false`
   - **Não** mexer no `mode` nem no `productChoice` — usuário continua na ficha de bota.

2. No `confirmOrder` (linhas 828–864), substituir `navigate('/relatorios')` por:
```tsx
toast.success(`Pedido ${numeroPedido.trim() || '(novo)'} lançado em Meus Pedidos!`, { position: 'bottom-right' });
resetForm();
```
(Aplicado nos dois ramos: grade e pedido único; para grade usar `${totalPedidos} pedidos gerados`.)

#### `src/pages/BeltOrderPage.tsx` (cintos)
Mesma estratégia: criar `resetForm()` que zera todos os campos do cinto e substituir `navigate('/relatorios')` da linha 236 por toast `bottom-right` + reset.

#### `src/pages/ExtrasPage.tsx` (extras)
Mesma coisa: criar `resetForm(productId)` que zera os states específicos do produto submetido e substituir `navigate('/relatorios')` da linha 262.

#### `src/pages/DynamicOrderPage.tsx` (fichas dinâmicas)
Substituir `navigate('/relatorios')` da linha 154 por toast + reset (`setValues({})`, `setQuantidade(1)`, `setPrecoBase(0)`, `setObservacao('')`, `setCliente('')`).

**Toast sempre com `{ position: 'bottom-right' }`** (sonner aceita por chamada).

---

### 3. Reset do form após criar/atualizar modelo

**Arquivo**: `src/pages/OrderPage.tsx` — funções `handleSaveTemplate` (linha 409) e `handleUpdateTemplate` (linha 415).

Após o `success`, chamar `resetForm()` (a mesma do ponto 2):
```tsx
const handleSaveTemplate = async () => {
  if (!user) return;
  const success = await tmpl.saveTemplate(user.id, buildFormData());
  if (success) {
    setMode('order');
    resetForm();
  }
};
const handleUpdateTemplate = async () => {
  if (!user) return;
  const success = await tmpl.updateTemplate(buildFormData());
  if (success) {
    setMode('order');
    resetForm();
  }
};
```

Assim, ao voltar pra criar outro modelo (ou pedido normal), o formulário começa em branco.

---

### 4. Garantir que "Modelo" sempre apareça nos relatórios

**Arquivo**: `src/components/SpecializedReports.tsx` (linhas 304 e 1225).

**Bug atual**: hoje o código só inclui o modelo no breakdown de preços se ele existir no array hardcoded `MODELOS`:
```tsx
const modeloP = MODELOS.find(m => m.label === o.modelo)?.preco;
if (modeloP) priceItems.push(['Modelo: ' + o.modelo, modeloP]);
```
Resultado: modelos novos cadastrados via admin (ficha_variacoes) **não aparecem** no PDF.

**Correção**: usar fallback em cascata (Hardcoded → ficha_variacoes via `findFichaPrice`) e **sempre** incluir o nome do modelo, mesmo que o preço seja 0:
```tsx
const modeloP = MODELOS.find(m => m.label === o.modelo)?.preco
  ?? findFichaPrice(o.modelo, 'modelo')
  ?? 0;
if (o.modelo) priceItems.push(['Modelo: ' + o.modelo, modeloP]);
```
- Aplicado nas 2 ocorrências (cobrança individual + cobrança consolidada).
- O hook `useFichaVariacoesLookup` já existe e expõe `findFichaPrice(itemName, customCat)` — só preciso chamá-lo no topo do componente onde o breakdown é gerado.
- Verifico também as outras seções de relatórios (Corte/Bordados/Forro já mostram `o.modelo` direto, sem depender de preço — então o ponto crítico era só o breakdown de cobrança).

---

### O que NÃO mexo
- Lógica de cálculo de total final (já usa `o.preco` direto, não o breakdown).
- Outras páginas / fluxos (auditoria, drafts, edição).
- Lista de modelos salvos (ponto 3 só zera o form, não a lista).

### Validação (você faz depois)
1. Selecionar 3 bordados de cano → o badge "3 selecionados" aparece ao lado do título do quadro.
2. Finalizar uma bota → toast no canto inferior direito, formulário **totalmente zerado**, continua na página de criação de bota.
3. Criar um modelo novo → salvar → confirmar que o form zera; criar outro modelo do zero.
4. Gerar um PDF de cobrança com pedido cujo modelo foi cadastrado no admin → confirmar que aparece "Modelo: X" no breakdown.

Aprova pra eu implementar tudo numa única passada.
