import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal Robôs | Harper Seguros",
  description: "Gerenciamento de robôs automatizados",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-950 text-gray-100 min-h-screen">{children}</body>
    </html>
  );
}
