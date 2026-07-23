/** @type {import('next').NextConfig} */

// Cabecalhos de seguranca aplicados a todas as rotas.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },                 // anti-clickjacking
  { key: "X-Content-Type-Options", value: "nosniff" },        // anti MIME-sniffing
  { key: "Referrer-Policy", value: "no-referrer" },           // nao vaza URL de origem
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS: forca HTTPS (ignorado em http/localhost pelos navegadores).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

module.exports = {
  reactStrictMode: true,
  poweredByHeader: false, // remove "X-Powered-By: Next.js" (menos fingerprinting)
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
