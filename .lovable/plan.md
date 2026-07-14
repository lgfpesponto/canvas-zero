## Bug
`DeployNoticeBanner` não filtra por `tipo`, então ele captura o comunicado geral também e o exibe como aviso de deploy (banner vermelho com contagem regressiva errada).

## Correção
Em `src/components/DeployNoticeBanner.tsx`, adicionar `.eq('tipo', 'deploy')` na query do `fetchActive()`. Uma linha só.

Nada mais precisa mudar — `ComunicadoBanner` já filtra por `tipo='comunicado'` corretamente.