# Metais: Enter deve parar em Strass, Bola Grande, Cruz, Bridão e Cavalo

## Problema

Depois de escolher a Cor do Metal (ou depois de marcar "Não tem" na Área do Metal), o Enter pula os cinco metais por quantidade e vai direto para Acessórios.

Motivo: cada um desses cinco campos é um select "Tem / Não tem" que já nasce com o valor "Não". A navegação por Enter considera qualquer select com valor preenchido como campo já respondido e o pula — igual acontecia antes nos outros campos "Tem / Não tem".

## Correção

Marcar os selects Tem/Não tem de Strass, Bola Grande, Cruz, Bridão e Cavalo como campos que nunca contam como "já preenchidos", para que o Enter sempre pare neles.

Fluxo resultante na categoria Metais:

- Área do Metal = **Não tem** → Enter vai direto para **Strass** (Tipo e Cor do Metal continuam sendo pulados).
- Área do Metal = **Metade / Inteira** → Rebite marcado automaticamente, Enter vai para **Cor do Metal** e de lá para **Strass**.
- De Strass segue para Bola Grande, Cruz, Bridão, Cavalo (parando na quantidade quando marcar "Tem") e só depois para **Acessórios**.

## Detalhes técnicos

- `src/pages/OrderPage.tsx`, bloco dos metais quantificáveis (grade com Strass/Bola Grande/Cruz/Bridão/Cavalo): adicionar `data-ficha-filled="false"` ao `<select>` de cada card (alternativa equivalente: envolver o card com `data-ficha-toggle="true"`, já tratado em `isNavFilled`).
- Nenhuma mudança em preço, obrigatoriedade ou regra de negócio — só ordem de foco.
