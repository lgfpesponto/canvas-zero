
# Reorganização da Ficha "Faça seu Pedido — Bota"

## Objetivo
Aplicar a nova ordem de seções pedida e criar a categoria **ESTAMPA** (que hoje aparece "solta" entre Laser e Pesponto), mover **Acessórios** (hoje em Identificação) e **Carimbo a Fogo** (hoje seção própria) para dentro de **EXTRAS**, mantendo intactos todos os cálculos de preço.

**Nenhum estado, cálculo, validação, persistência ou nome de campo é alterado.** Só muda a ordem visual e o agrupamento (faixa laranja) — exatamente o mesmo princípio aplicado nas mudanças anteriores.

---

## Arquivo afetado
- `src/pages/OrderPage.tsx` (apenas o JSX de renderização — linhas ~1100-1390)

---

## Nova ordem das faixas (Bota, modo `order`)

| # | Faixa (Section) | Conteúdo |
|---|---|---|
| 1 | **IDENTIFICAÇÃO** | Vendedor, Número do Pedido, Cliente, Tamanho/Gênero/Modelo, Sob Medida, Desenvolvimento, Link da Foto + Ver foto. **(Remover "Acessórios" daqui — vai para EXTRAS)** |
| 2 | **COUROS** | Tipo+Cor Couro Cano / Gáspea / Taloneira |
| 3 | **PESPONTO** | Cor da Linha, Cor da Borrachinha, Cor do Vivo |
| 4 | **SOLADO** | Tipo de Solado, Formato do Bico, Cor da Sola, Cor da Vira, Costura Atrás |
| 5 | **BORDADO** | Bordados (Cano/Gáspea/Taloneira) + Nome Bordado (mover `ToggleField Nome Bordado` para dentro desta seção) |
| 6 | **LASER** | Laser Cano/Gáspea/Taloneira + Pintura (mantém como está hoje) |
| 7 | **ESTAMPA** *(nova faixa)* | Envolver o `ToggleField Estampa` (hoje solto na linha 1262) dentro de `<Section title="Estampa">` |
| 8 | **METAIS** | Área, Tipo, Cor, Strass, Bola Grande, Cruz, Bridão, Cavalo |
| 9 | **EXTRAS** | Acessórios *(movido de Identificação)*, Tricê, Tiras, Franja, Corrente, **Carimbo a Fogo** *(movido da seção própria)* |
| 10 | **ADICIONAL** | Descrição + Valor |
| 11 | **OBSERVAÇÃO** *(faixa nova ou label simples — vide pergunta abaixo)* | Textarea de observação |

> **Desenvolvimento**: hoje está solto entre Couros e Bordados (linha 1205). Como você não citou explicitamente, vou **mantê-lo dentro de IDENTIFICAÇÃO** (logo após Sob Medida, antes do link da foto), conforme a estrutura já aprovada anteriormente. Assim ele sai de cima do bloco Couros.

---

## Mudanças concretas no JSX

### a) Em **IDENTIFICAÇÃO** (linha 1102–1187)
- **Remover** a linha 1157: `<MultiSelect label="Acessórios" ... />` (vai para Extras).
- Manter Desenvolvimento aqui (mover a linha 1205 para dentro da seção, logo após "Sob Medida").

### b) Em **BORDADOS** (linha 1208–1226)
- Mover `ToggleField "Nome Bordado"` (linha 1229) para **dentro** desta `<Section>`, ao final.

### c) Reordenar blocos
A nova sequência do JSX fica:
```
<Section "Identificação"> ... </Section>
<Section "Couros"> ... </Section>
<Section "Pesponto"> ... </Section>     ← movido para cá
<Section "Solados"> ... </Section>      ← movido para cá
<Section "Bordados"> ... + Nome Bordado </Section>
<Section "Laser"> ... + Pintura </Section>
<Section "Estampa">                     ← FAIXA NOVA
  <ToggleField Estampa ... />
</Section>
<Section "Metais"> ... </Section>
<Section "Extras">
  <MultiSelect Acessórios ... />        ← movido pra cá
  <ToggleField Tricê />
  <ToggleField Tiras />
  <ToggleField Franja /> + descrições
  <ToggleField Corrente /> + cor
  {/* Carimbo a Fogo movido pra cá */}
  <div>Carimbo + descrição</div>
</Section>
<Section "Adicional"> ... </Section>
<div>Observação textarea</div>
```

### d) Remover
- A `<Section title="Carimbo a Fogo">` autônoma (linhas 1361-1369) — seu conteúdo vai para dentro de Extras.
- O `<hr>` divisor da linha 1259 (a faixa Estampa já cumpre o papel de separação).

---

## Garantias (cálculo intacto)
- **Nenhum `useState`, handler, função `total*`, payload de salvamento ou label de campo é tocado.**
- Acessórios continua sendo o mesmo `acessorios` state com o mesmo `MultiSelect items={ACESSORIOS}` — só o local visual muda.
- Carimbo a Fogo continua usando `carimbo` + `carimboDesc` com o mesmo `<select>` + descrição.
- Estampa continua usando o mesmo `ToggleField` com o mesmo `estampa`/`estampaDesc` — só ganha uma faixa laranja em volta.
- A somatória do preço (linhas 558, 568, 797, etc.) **não é alterada** — só a posição do JSX muda.

---

## Modo `template` (criar modelo)
A reorganização vale **somente para `mode === 'order'`** (ficha de pedido real). O modo template usa um JSX simplificado e não foi mencionado — fica como está.

---

## Fora do escopo
- Ficha de Cinto (`BeltOrderPage.tsx`) não tem Estampa/Acessórios/Pesponto/Metais — não precisa de mudança.
- `OrderDetailPage` (Meus Pedidos) — a faixa "Estampa" já pode ser adicionada lá também se quiser; me avisa que aplico junto na próxima rodada se for o caso.
- PDFs, relatórios, dashboards, validações, banco — nada disso muda.

---

## Pergunta rápida (única)
A última linha "Observação" hoje é só um `<label>` + `<textarea>` solto, sem faixa laranja. Você listou "OBSERVAÇÃO" na sequência das categorias — quer que eu **adicione uma faixa OBSERVAÇÃO** (igual às outras) ou mantém só o label simples?

Se não responder, vou **adicionar a faixa OBSERVAÇÃO** para ficar consistente com as demais categorias da sua lista.
