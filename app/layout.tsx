import "./globals.css";

export const metadata = {
  title: "C-Suite AI — Gerador (Q1 Digital)",
  description: "Gerador interno de sistema de vendas C-Suite AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
