import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Script from "next/script";

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
    default: "BrokerOn | Plataforma Operacional para Corretoras de Seguros",
    template: "%s | BrokerOn"
  },
  description: "Centralize vendas, carteira, renovações, comissões, sinistros e inteligência operacional em uma plataforma criada para corretoras de seguros.",
  keywords: ["BrokerOn", "Grupo Omnitheus", "sistema para corretora de seguros", "gestão de corretora", "CRM para corretora de seguros", "automação para corretoras", "gestão de apólices", "gestão de comissões", "renovação de seguros", "analytics seguros", "integração Quiver"],
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
    title: "BrokerOn | A operação da sua corretora, conectada",
    description: "Vendas, carteira, renovações, comissões e inteligência operacional em uma plataforma feita para corretoras de seguros.",
    siteName: "BrokerOn",
  },
  twitter: {
    card: "summary",
    title: "BrokerOn | Plataforma para Corretoras de Seguros",
    description: "Conecte vendas, carteira, renovações, comissões e inteligência operacional.",
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
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-259QSQBG2L"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-259QSQBG2L');
          `}
        </Script>
      </head>
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
