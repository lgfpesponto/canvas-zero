## Objetivo
Mover o toggle "Baixa automática" (admin master) para uma linha **abaixo** da toolbar de filtros, em vez de ficar empurrado à direita na mesma linha de Período/Vendedor.

## Mudança
- Arquivo: `src/components/financeiro/saldo/FinanceiroSaldoRevendedor.tsx` (linhas ~245-270).
- Remover o bloco `Baixa automática` de dentro do flex de filtros (tirar o `ml-auto`).
- Renderizar logo após o `</div>` da toolbar, dentro de um wrapper próprio alinhado à esquerda (`flex justify-start`), mantendo o mesmo visual do "pill" verde/âmbar e o tooltip.
- Nada muda na lógica do switch nem nos demais cards/avisos.

Resultado: filtros ocupam a primeira linha; o pill da Baixa automática fica abaixo, antes do alerta amarelo "Baixa automática desligada".
