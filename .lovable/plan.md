Remove a segunda frase da mensagem padrão de WhatsApp de rastreio.

Arquivo a editar:
- `src/lib/whatsappSend.ts` — função `buildTrackingMessage`

Alteração:
- Remover completamente a linha que começa com "Esse contato é somente para avisos e não recebe mensagens. Para dúvidas, entre em contato com o número oficial da loja: ..."
- A mensagem ficará apenas: `Olá {cliente}! Seu pedido {número} da loja {nome da loja} foi cadastrado. Acompanhe a produção em tempo real com esse link: {link}`

Nenhuma outra mudança no sistema é necessária.
