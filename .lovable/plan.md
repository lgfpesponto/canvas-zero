## Objetivo

Incluir todos os campos de **recorte** (Cano, Gáspea e Taloneira), junto com suas cores, na descrição de cada pedido no **Relatório de Corte**.

## Situação atual

Em `src/components/SpecializedReports.tsx`, a função `generateCortePDF` monta a coluna "Descrição do Corte" com:

- Couro do Cano / Gáspea / Taloneira (com cor)
- Modelo / tamanho / gênero
- Acessórios, estampa, extras, observação

Ela **não imprime** os campos `recorteCano`, `recorteGaspea`, `recorteTaloneira` nem suas cores (`corRecorteCano`, `corRecorteGaspea`, `corRecorteTaloneira`), embora esses dados já existam no pedido (banco e modelo `Order`).

## Mudança proposta

Em `src/components/SpecializedReports.tsx`, dentro do laço `for (const o of filtered)` da `generateCortePDF` (somente para botas — não cintos), adicionar três linhas logo após os três `Talon.:`:

```
Recorte Cano: <recorteCano> - <corRecorteCano>
Recorte Gáspea: <recorteGaspea> - <corRecorteGaspea>
Recorte Talon.: <recorteTaloneira> - <corRecorteTaloneira>
```

Cada linha aparece somente se o campo de recorte ou sua cor estiver preenchido. O hífen com a cor só aparece quando a cor existir.

## Resultado

No PDF do Relatório de Corte, cada pedido de bota mostrará, junto da descrição do couro, todos os recortes selecionados na ficha com suas respectivas cores. Cintos seguem inalterados.
