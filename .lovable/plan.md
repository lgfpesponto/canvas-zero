## Objetivo
Remover o link "FINANCEIRO" do menu superior — o acesso passa a ser exclusivamente pela aba dentro de `/admin/configuracoes`.

## Alteração
`src/components/Header.tsx` linha 48: remover a linha
```ts
...(isJuliana ? [{ label: 'FINANCEIRO', path: '/financeiro' }] : []),
```

## Mantido
- Rota `/financeiro` continua funcionando (links internos do sino e do dashboard não quebram).
- Link "COMPROVANTES" (`/financeiro/saldo`) para vendedores permanece.
- Aba financeiro em Configurações continua disponível.