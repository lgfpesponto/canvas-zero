

## Plano: Criar Relacionamentos de Variações da Bota via Script de Migração

### Contexto
As variações dos campos da bota (Tamanho, Modelo, Solado, Formato do Bico, Cor da Sola, Cor da Vira, Tipo de Couro, Cor do Couro) precisam ter seus relacionamentos (`relacionamento` jsonb) populados de acordo com as regras de negócio já implementadas no código (`src/lib/orderFieldsConfig.ts` e `docs/BUSINESS_RULES.md`).

### Regras a implementar como relacionamentos

#### 1. Tamanho → Modelo
- Tamanhos 24-33: relacionam com `Bota Infantil`, `Botina Infantil`, `Cano Médio Infantil`
- Tamanhos 34-45: relacionam com modelos adultos (Tradicional, Feminino, Peão, Coturno, Destroyer, Capota, Over, etc.)
- Tamanhos 34-40: incluem `Bota Montaria (40)`, `City`
- Tamanhos 33-40: incluem `Bota Bico Fino Feminino`, `Capota Bico Fino`
- Tamanho 33: tem infantis + Bico Fino Feminino + Capota Bico Fino

#### 2. Modelo → Solado (5 blocos)
- **Infantil** (Bota Infantil, Botina Infantil, Cano Médio Infantil) → `Infantil`
- **City** → `Borracha City`
- **Tradicional** (11 modelos) → `Borracha`, `Couro Reta`, `Couro Carrapeta`, `Couro Carrapeta com Espaço Espora`, `Jump`, `Rústica`
- **Bico Fino Feminino** (2 modelos) → `PVC`, `Couro Reta`
- **Perfilado** (4 modelos) → `PVC`, `Couro Reta`

#### 3. Modelo → Formato do Bico
- Infantil → `Quadrado`
- City → `Fino Ponta Redonda`
- Tradicional → `Quadrado`, `Redondo`
- Bico Fino Feminino → `Fino Ponta Redonda`
- Perfilado → `Fino Agulha Ponta Quadrada`, `Fino Agulha Ponta Redonda`

#### 4. Modelo → Cor da Vira
- Infantil → `Bege`
- City → `Neutra`
- Tradicional (Borracha) → `Bege`, `Rosa`, `Preto`; (demais) → `Neutra`
- Bico Fino Feminino → `Neutra`
- Perfilado → `Neutra`

#### 5. Tipo de Couro → Cor do Couro
- `Vaca Holandesa` → `Malhado`, `Preto`, `Branco`
- `Vaca Pintada` → `Caramelo`, `Preto e Branco`
- `Metalizado` → `Rosa Neon`
- `Crazy Horse`, `Escamado` → cores gerais + `Nescau`
- `Nobuck`, `Estilizado em Tilápia` → cores gerais + `Chocolate`
- `Látego`, `Estilizado em Cobra/Jacaré/Avestruz/Dinossauro/Tatu` → cores gerais + `Marrom`
- Demais tipos → cores gerais (sem restritas)

### Implementação

#### Arquivo: criar um script executável via `code--exec`
1. Consultar todos os IDs de variações dos campos relevantes (tamanho, modelo, solado, formato_bico, cor_sola, cor_vira, tipo_couro, cor_couro)
2. Montar um mapa `nome → id` para cada campo
3. Gerar os UPDATEs SQL para popular o campo `relacionamento` de cada variação
4. Executar via Supabase SDK ou SQL direto

#### Estrutura do `relacionamento` (jsonb)
```json
{
  "modelo": ["id-bota-infantil", "id-botina-infantil", ...],
  "solado": ["id-borracha", "id-couro-reta", ...]
}
```
As chaves do jsonb usam o **slug do campo** destino, e os valores são arrays de **nomes das variações** vinculadas (seguindo o padrão já usado no `AdminEditableOptions`).

#### Nenhuma alteração no código da página
- A estrutura de edição existente permanece intocada
- Os relacionamentos são apenas dados no banco que o admin pode depois ajustar manualmente via o botão 🔗

### Detalhes técnicos
- IDs dos campos já identificados:
  - `tamanho`: `53e7a90a-5a36-40ec-8414-f390c0bda331`
  - `modelo`: `a5587024-cf5b-4b11-8be4-45a579f58966`
  - `solado`: `0eca6cb9-1a9a-4344-b8bf-62a31175d4b0`
  - `formato_bico`: `833ed8f7-966b-4b62-a278-6f50728f31b6`
  - `cor_sola`: `d2d37b2d-3aba-45fa-83b2-f7b5e1bc0078`
  - `cor_vira`: `b28472ce-be91-40a5-ab90-c9eb43c3108b`
  - `tipo_couro`: `72a62254-4d7d-4394-b126-97aa3d15f9df`
  - `cor_couro`: `23fcec62-6cbf-41f1-8a69-be3b24abbf26`
- O script será executado uma única vez via `code--exec` usando a API REST do Supabase

