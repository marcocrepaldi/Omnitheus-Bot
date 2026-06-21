import Link from "next/link";
import { Mail, MapPin, MessageCircle } from "lucide-react";

const whatsapp = "https://wa.me/5511985266582";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.07] bg-[#050609] py-14 text-zinc-500">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.3fr_.7fr_.7fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-emerald-400 font-display text-sm font-black text-white">B</span>
              <span className="font-display text-xl font-bold text-white">Broker<span className="text-emerald-300">On</span></span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-6">Plataforma operacional para corretoras de seguros. Vendas, carteira, renovações, comissões e inteligência trabalhando em conjunto.</p>
            <p className="mt-3 text-xs">Um produto do Grupo Omnitheus.</p>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-300">Plataforma</h2>
            <ul className="mt-5 space-y-3 text-sm">
              <li><Link href="/#plataforma" className="hover:text-white">Visão geral</Link></li>
              <li><Link href="/recursos" className="hover:text-white">Todos os recursos</Link></li>
              <li><Link href="/#integracoes" className="hover:text-white">Integrações</Link></li>
              <li><Link href="/#seguranca" className="hover:text-white">Segurança</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-300">Informações</h2>
            <ul className="mt-5 space-y-3 text-sm">
              <li><Link href="/#faq" className="hover:text-white">Perguntas frequentes</Link></li>
              <li><Link href="/politica-privacidade" className="hover:text-white">Privacidade</Link></li>
              <li><Link href="/termos-de-uso" className="hover:text-white">Termos de uso</Link></li>
              <li><Link href="https://brokeron.omnitheus.com.br/" target="_blank" className="hover:text-white">Acessar plataforma</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-300">Fale com a gente</h2>
            <ul className="mt-5 space-y-4 text-sm">
              <li><Link href={whatsapp} target="_blank" className="flex items-center gap-3 hover:text-white"><MessageCircle className="h-4 w-4 text-emerald-300" />(11) 98526-6582</Link></li>
              <li><a href="mailto:contato@omniheus.com.br" className="flex items-center gap-3 hover:text-white"><Mail className="h-4 w-4 text-emerald-300" />contato@omniheus.com.br</a></li>
              <li className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /><span>R. Pais Leme, 215<br />Pinheiros, São Paulo — SP</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.07] pt-7 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} BrokerOn — Grupo Omnitheus.</p>
          <p>Feito para corretoras que querem operar melhor.</p>
        </div>
      </div>
    </footer>
  );
}
