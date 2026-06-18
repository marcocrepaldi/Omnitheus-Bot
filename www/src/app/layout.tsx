import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "BrokerOn | Automação e RPA para Corretoras de Seguros com Quiver",
    template: "%s | BrokerOn"
  },
  description: "Simplifique sua gestão no Quiver. O BrokerOn, do Grupo Omnitheus, automatiza a verificação de credenciais expiradas, garante sincronização rápida com o Cofre de Senhas Pro criptografado em AES e concilia comissões sem trabalho manual.",
  keywords: ["BrokerOn", "Grupo Omnitheus", "Quiver automação", "Quiver robô", "corretora de seguros automação", "sincronizar senha quiver", "cofre senhas corretora", "RPA seguros", "conciliação comissões quiver"],
  authors: [{ name: "Grupo Omnitheus" }],
  creator: "Grupo Omnitheus",
  publisher: "Grupo Omnitheus",
  metadataBase: new URL("https://brokeron.com.br"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://brokeron.com.br",
    title: "BrokerOn | Automação para Corretoras de Seguros",
    description: "Simplifique a gestão da sua corretora no Quiver com o BrokerOn. Automação de credenciais, cofre de senhas e conciliação de comissões.",
    siteName: "BrokerOn",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BrokerOn - Automação Inteligente de Corretoras",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BrokerOn | Automação Quiver",
    description: "Robôs inteligentes para atualizar credenciais e baixar comissões no Quiver.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 selection:bg-violet-600 selection:text-white">
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
