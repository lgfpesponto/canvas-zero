## Igual aos Modelos Rascunhos — só a foto

Remover o QR code do `ScannedQr`. A visualização passa a ser apenas a `<img>` com `object-contain` sobre fundo branco (foto inteira, sem corte, sem QR embaixo). Se a imagem falhar, mostra "Sem foto".

Isso também deixa a exibição mais rápida (não renderiza mais o SVG do QR grande em cada card do expandir).

### Arquivo
- `src/components/ficha/VariacaoFotoIcon.tsx`:
  - `ScannedQr` renderiza só `<img src={imgSrc} className="object-contain ...">` (converte Drive → `lh3.googleusercontent.com/d/{ID}` como já faz hoje).
  - Sem `QRCodeSVG`, sem botão "Escanear" invisível (não é mais necessário — a foto direta já é a "leitura").
  - Fallback `onError`: div "Sem foto".
- `src/components/ficha/VariacaoExpandirDialog.tsx`: o card já usa `ScannedQr` — nada a mudar.

Sem outras mudanças.
