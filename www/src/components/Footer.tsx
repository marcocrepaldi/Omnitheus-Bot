import Link from "next/link";
import { Mail, Phone, MapPin, Bot, Shield, FileSpreadsheet, Percent, Activity, QrCode } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const serviceLinks = [
    { name: "Credenciais Quiver", href: "/servicos/gestao-credenciais", icon: Bot },
    { name: "Cofre de Senhas Pro", href: "/servicos/cofre-pro", icon: Shield },
    { name: "Relatórios de Vendas", href: "/servicos/relatorios-vendas", icon: FileSpreadsheet },
    { name: "Conciliação & Comissões", href: "/servicos/conciliacao-comissoes", icon: Percent },
    { name: "Sinistros & Clientes", href: "/servicos/gestao-sinistros-clientes", icon: Activity },
    { name: "Captação de Leads", href: "/servicos/captacao-leads", icon: QrCode },
  ];

  const infoLinks = [
    { name: "Segurança & Criptografia", href: "/#seguranca" },
    { name: "Perguntas Frequentes (FAQ)", href: "/#faq" },
    { name: "Política de Privacidade", href: "/politica-privacidade" },
  ];

  return (
    <footer className="relative border-t border-zinc-800 bg-zinc-950 py-16 text-zinc-400">
      {/* Background glow overlay */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.05),transparent_60%)] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          
          {/* Brand & Pitch */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white font-display">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-emerald-500 text-white font-semibold">
                B
              </span>
              <span>
                Broker<span className="text-violet-400">On</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-zinc-400">
              BrokerOn é um sistema do Grupo Omnitheus. Automações inteligentes e seguras de processos (RPA) para corretoras de seguros integradas ao sistema Quiver.
            </p>
          </div>

          {/* Service Pages (SEO booster) */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white font-display">Nossos Serviços</h3>
            <ul className="flex flex-col gap-2">
              {serviceLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="flex items-center gap-2 text-sm transition-colors hover:text-white">
                    <link.icon className="h-4 w-4 text-violet-400" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Useful Links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white font-display">Informações</h3>
            <ul className="flex flex-col gap-2">
              {infoLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm transition-colors hover:text-white">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white font-display">Contato & Localização</h3>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-3 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>R. Pais Leme, 215, Conj. 1713<br />Pinheiros, São Paulo - SP</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-emerald-400" />
                <Link
                  href="https://wa.me/5511978350552?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20o%20BrokerOn!"
                  target="_blank"
                  className="transition-colors hover:text-white"
                >
                  (11) 97835-0552
                </Link>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-emerald-400" />
                <a href="mailto:contato@omniheus.com.br" className="transition-colors hover:text-white">
                  contato@omniheus.com.br
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-16 border-t border-zinc-800/60 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <p>&copy; {currentYear} BrokerOn - Grupo Omnitheus. Todos os direitos reservados. CNPJ sob consulta.</p>
          <div className="flex gap-4">
            <Link href="/politica-privacidade" className="hover:text-white">Políticas de Privacidade</Link>
            <Link href="/termos-de-uso" className="hover:text-white">Termos de Uso</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
