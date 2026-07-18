// Serve HTML with per-link OG meta tags for social crawlers (WhatsApp, Telegram, etc).
// Browsers are redirected to the SPA route /vitrine/<token>.

const SPA_ORIGIN = "https://portal.7estrivos.com.br";

const CRAWLER_UA = /(whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|slackbot|linkedinbot|discordbot|pinterest|redditbot|embedly|quora|outbrain|vkshare|w3c_validator|preview|bingbot|googlebot|applebot|bot|crawler|spider)/i;

const b64urlDecode = (s: string): string => {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const extractTitulo = (token: string | null): string => {
  if (!token) return "Vitrine 7ESTRIVOS";
  try {
    const obj = JSON.parse(b64urlDecode(token));
    const t = obj && typeof obj.titulo === "string" ? obj.titulo.trim() : "";
    return t || "Vitrine 7ESTRIVOS";
  } catch {
    return "Vitrine 7ESTRIVOS";
  }
};

Deno.serve((req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  const titulo = escapeHtml(extractTitulo(token));
  const descricao = "Produtos disponíveis em estoque";
  const spaUrl = token ? `${SPA_ORIGIN}/vitrine/${encodeURIComponent(token)}` : `${SPA_ORIGIN}/`;

  const ua = req.headers.get("user-agent") || "";
  const isCrawler = CRAWLER_UA.test(ua);

  if (!isCrawler) {
    return new Response(null, { status: 302, headers: { Location: spaUrl } });
  }

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${titulo}</title>
<meta name="description" content="${descricao}" />
<link rel="canonical" href="${spaUrl}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${titulo}" />
<meta property="og:description" content="${descricao}" />
<meta property="og:url" content="${spaUrl}" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="${titulo}" />
<meta name="twitter:description" content="${descricao}" />
<meta http-equiv="refresh" content="0; url=${spaUrl}" />
</head>
<body>
<p><a href="${spaUrl}">${titulo}</a></p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
});
