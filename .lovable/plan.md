## Problema

O comprovante de Maria Gabriela do dia 19/05/2026 (id `c296258b…`) foi gravado no banco com `valor = 15.329` (quinze reais e trinta e três centavos) porque a IA extratora interpretou "15.329,00" usando ponto como separador decimal. Por isso a lista mostra **R$ 15,33** em vez de **R$ 15.329,00**.

## O que vou fazer

### 1. Corrigir o registro específico (migration)
`UPDATE revendedor_comprovantes SET valor = 15329.00 WHERE id = 'c296258b-d143-4ab7-a67c-fc03df8542c3'`

Isso já resolve a exibição na listagem de comprovantes da Maria Gabriela, no total "Aprovado (lista)" e em qualquer baixa futura.

### 2. Prevenir recorrência — botão "Editar valor" (admin_master)
Na tabela de `ComprovantesPorRevendedor` (a que admin_master usa para revisar), adicionar um pequeno botão de lápis ao lado do valor que abre um dialog simples para corrigir o `valor` manualmente quando a IA errar. Restrito a `admin_master`, registrando no `audit_log` (motivo opcional).

Nada além disso muda: regras de saldo, baixa automática, layout, permissões dos demais perfis e o fluxo de envio do vendedor continuam idênticos.

### Detalhes técnicos
- Migration: 1 UPDATE pontual.
- Frontend: ajuste apenas em `src/components/financeiro/saldo/ComprovantesPorRevendedor.tsx` + novo `EditarValorComprovanteDialog.tsx`.
- Sem alteração na edge `extract-comprovante` (a IA continua errando às vezes — o botão de correção cobre isso sem risco de regressão).

Posso aplicar?