## Objetivo

Ajustar o "Faça seu pedido - Bota":

1. Criar novo modelo **Botina Bico Fino** (R$ 200), disponível somente nos tamanhos 34-44.
2. Reverter regras extras adicionadas à **Botina** original (voltar ao comportamento anterior).

Todas as alterações ficam em `src/lib/orderFieldsConfig.ts`. Nenhuma mudança em banco, backend ou outros PDFs além do já existente `getForma` usado na ficha impressa.

---

## Botina Bico Fino (novo modelo)

- **MODELOS**: incluir `{ label: 'Botina Bico Fino', preco: 200 }`.
- **getModelosForTamanho**: liberar apenas para tamanhos 34-44.
- **Bloco de vinculação**: criar novo `ModelBlock = 'botinaBicoFino'` e mapear em `getBlockForModelo`.
- **Solados** (`getSoladosForModelo`): apenas `Couro Reta` e `PVC`.
- **Formato do bico** (`getBicosForModeloSolado`):
  - `Couro Reta` → `Fino Agulha Ponta Quadrada`, `Fino Agulha Ponta Redonda`.
  - `PVC` → `Fino Agulha Ponta Quadrada`.
- **Cor da sola** (`getCorSolaOptions`):
  - `Couro Reta` → `Madeira`, `Pintada de Preto`.
  - `PVC` → `Marrom` (preço R$ 0 — usar override no bloco).
- **Cor da vira** (`getCorViraOptions`): `Neutra` (mesmo padrão dos outros bico fino).
- **HIDE_PESPONTO_EXTRAS**: incluir `'Botina Bico Fino'` (mesmo tratamento da Botina).
- **getForma** (usado na ficha impressa): retornar `'4394'` para Botina Bico Fino, independente do solado (confirmado pelo usuário).

---

## Reverter Botina (voltar ao anterior)

Na Botina padrão:

- **getSoladosForModelo**: remover o `if (modelo === 'Botina')` que adicionava PVC. Passa a cair no bloco `tradicional` normal (Borracha, Couro Reta, Couro Carrapeta, Couro Carrapeta com Espaço Espora, Jump, Rústica).
- **getBicosForModeloSolado**: remover o `if (modelo === 'Botina')` que adicionava `Fino Agulha Ponta Quadrada/Redonda` e a variação PVC. Passa a cair no bloco `tradicional` (Quadrado / Redondo, com Rústica = só Quadrado).
- **getCorSolaOptions**: remover o `if (modelo === 'Botina' && solado === 'PVC')`. Volta ao bloco `tradicional`.
- Remover o helper interno `botinaTamanhoAceitaFinoAgulha` (não é mais usado).

Resultado: Botina fica idêntica ao que era antes das últimas alterações; toda a lógica de "bico fino agulha + PVC" fica isolada no novo modelo **Botina Bico Fino**.

---

## Fora do escopo

- Nenhuma mudança em preços de outros modelos, em outros campos (couro, bordado, laser, metais, etc.), em edge functions, em banco ou em outros PDFs. O `pdfGenerators` continua consumindo `getForma` normalmente.
