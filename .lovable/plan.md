## Ajustes na Ficha de Produção da Bota (`src/pages/OrderPage.tsx`)

### 1. Vendedor obrigatório (confirmação + reforço)
**Estado atual**: Existe validação só para `admin_producao` (linha 783). `admin_master` consegue submeter sem escolher vendedor explicitamente (usa default do select).

**Mudança**: Adicionar `Vendedor` ao array `required` para qualquer admin:
```ts
...(isAdmin ? [[vendedorSelecionado, 'Vendedor'] as [string, string]] : []),
```
Assim qualquer admin que tente submeter sem vendedor selecionado recebe o toast padrão "Preencha: Vendedor". Para vendedores comuns o campo já é preenchido automaticamente com `user.nomeCompleto` (readonly).

### 2. Reorganização da seção IDENTIFICAÇÃO

**Estado atual** (linhas 1177-1227):
- Linha 1 (2 colunas): Vendedor | Número do Pedido | Cliente (vira 3º na 2ª linha)
- Linha 2 (3 colunas): Tamanho | Gênero | Modelo

**Mudança**:
- **Linha 1 (3 colunas)**: Vendedor | Número do Pedido | Cliente
- **Linha 2 (3 colunas)**: **Tamanho** (ao lado do Cliente conceitualmente, mas posicionado primeiro nesta linha) | Gênero | Modelo

Como o usuário pediu "tamanho do lado do cliente" e "ajustar o tamanho dos campos genero e modelo para ficarem com layout organizado igual os de cima":
- Mudar a primeira grid de `sm:grid-cols-2` para `sm:grid-cols-3` (Vendedor, Nº Pedido, Cliente já alinhados em 3 colunas iguais).
- A segunda grid permanece `sm:grid-cols-3` (Tamanho, Gênero, Modelo) — todos com a mesma largura/altura dos campos da linha de cima.
- O campo Foto continua acima como primeiro item da seção (já está assim).

Isso garante uniformidade visual: todas as linhas em 3 colunas iguais, mesma altura de inputs/selects.

### 3. Reorganização da seção METAIS (linhas 1344-1385)

**Estado atual**:
- Linha 1: Área do Metal | Tipo do Metal (lista de checkboxes) | Cor do Metal
- Linha 2: 5 toggles soltos (Strass, Bola Grande, Cruz, Bridão, Cavalo) cada um com input de qtd inline ao lado.

**Mudanças**:
1. **Separador horizontal fino** entre o bloco "Área/Tipo/Cor do Metal" e os metais quantificáveis:
   ```tsx
   <div className="border-t border-border/60 my-2" />
   ```
   (linha sutil, sem peso visual exagerado).

2. **Padronização dos metais "tem/não tem"** (Strass, Bola Grande, Cruz, Bridão, Cavalo):
   - Substituir o layout atual (toggle horizontal + qtd ao lado) por **cards verticais uniformes**:
     - Nome do metal + preço em cima (label).
     - Toggle (Sim/Não) embaixo do nome.
     - Quando ativo, input de quantidade aparece logo abaixo.
   - Grid `sm:grid-cols-3 lg:grid-cols-5 gap-3` para distribuir os 5 metais de forma equilibrada (cabem todos lado a lado em telas grandes; em médias quebra 3+2).
   - Cada item dentro de um wrapper `flex flex-col gap-2 p-3 rounded-lg border border-border/40 bg-muted/30` para aspecto padronizado.

   Estrutura por item:
   ```tsx
   <div className="flex flex-col gap-2 p-3 rounded-lg border border-border/40 bg-muted/30">
     <span className="text-xs font-semibold">Strass (R$0,60/un)</span>
     <ToggleField label="" value={strass} onChange={setStrass} compact />
     {strass && (
       <input type="number" min={0} value={strassQtd} ... className={cls.inputSmall} placeholder="Qtd" />
     )}
   </div>
   ```
   *Observação*: o `ToggleField` atual aceita `label` — passamos string vazia para evitar duplicidade já que o nome está acima. Se isso renderizar layout estranho, fazemos uma versão inline simples com `<Switch>` direto. Avaliarei na implementação.

### Arquivos a editar
- `src/pages/OrderPage.tsx` (único arquivo afetado).

### Sem mudanças
- Validação de vendedores comuns (já preenchido automaticamente).
- Lógica de cálculo de preço dos metais.
- Estrutura do PDF / ficha impressa (layout só do formulário).
