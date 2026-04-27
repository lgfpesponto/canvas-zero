# Faixas de categoria nos formulários "Faça seu Pedido"

## Correção do erro anterior
Na minha entrega anterior, apliquei as faixas no lugar errado (`OrderDetailPage` — meus pedidos / detalhes) **e** ainda renomeei categorias (ex: virou "acabamento" no lugar de "pesponto"). Agora vou:

1. **Reverter** completamente o `OrderDetailPage.tsx` para a renderização plana original (sem faixas, sem agrupamento, sem renomear nada).
2. **Aplicar** as faixas nos formulários **Faça seu Pedido — Bota** e **Faça seu Pedido — Cinto**, usando os **nomes reais já existentes** no código (sem trocar nada), em **MAIÚSCULAS** e fonte **maior**.

---

## Onde aplicar as faixas

### 1. `src/pages/OrderPage.tsx` — Bota
Atualizar o componente `Section` (linhas 45-50). Hoje renderiza um `<h3>` simples com borda inferior. Vai virar uma faixa laranja terracota cobrindo toda a largura.

Os títulos atuais (que serão **mantidos exatamente**, só exibidos em maiúsculas via CSS):
- `Couros`
- `Bordados`
- `Laser`
- `Pesponto` ← (estava errado como "acabamento")
- `Metais`
- `Extras`
- `Solados`
- `Carimbo a Fogo`
- `Adicional`

### 2. `src/pages/BeltOrderPage.tsx` — Cinto
Atualizar o componente `Section` correspondente (linha 23-26, mesma assinatura). Títulos mantidos:
- `Couro`
- `Fivela`
- `Bordado P (+R$...)`
- `Nome Bordado (+R$...)`
- `Carimbo a Fogo`
- `Adicional`

### 3. `src/pages/OrderDetailPage.tsx` — Reverter
Remover toda a lógica de `detailsGrouped` / `extraGrouped` / `buildExtraGrouped` adicionada anteriormente e voltar ao render plano original (uma lista única de pares label/valor em grid de 2 colunas), sem faixas.

---

## Estilo da faixa (igual ao print do "couro")

```tsx
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h3 className="bg-primary text-primary-foreground text-center font-display font-bold text-lg uppercase tracking-wide py-2 rounded-sm">
      {title}
    </h3>
    {children}
  </div>
);
```

Detalhes:
- **Cor**: `bg-primary` (já é o laranja terracota da paleta 7Estrivos — bate com a referência da imagem).
- **Texto**: branco (`text-primary-foreground`), centralizado, **MAIÚSCULAS** via `uppercase`, fonte `text-lg` (maior que o atual `text-base`), `font-bold`.
- **Largura**: total do bloco (já é block por padrão).
- **Não renomeio** nenhuma categoria — uso o `title` exato passado por cada `<Section>`.

## Fora do escopo
- Não vou mexer em PDFs, lista "Meus Pedidos" (OrderCard), nem em formulários de Extras (Kit Faca, Tiras, etc.).
- Não altero cálculo de preços, ordenação de campos nem visibilidade condicional.
- Nenhuma alteração no banco.

## Resultado esperado
- Ao abrir "Faça seu Pedido → Bota" ou "Faça seu Pedido → Cinto", cada bloco aparece com uma faixa laranja com o nome **MAIÚSCULO** da categoria real (COUROS, BORDADOS, LASER, **PESPONTO**, METAIS, EXTRAS, SOLADOS, CARIMBO A FOGO, ADICIONAL).
- "Meus Pedidos" e a tela de detalhes voltam ao layout original sem faixas e sem nomes errados.
