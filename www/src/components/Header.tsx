"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";

const whatsapp =
  "https://wa.me/5511985266582?text=Olá,%20quero%20conhecer%20a%20plataforma%20BrokerOn%20para%20minha%20corretora.";

const links = [
  { label: "Plataforma", href: "/#plataforma" },
  { label: "Recursos", href: "/recursos" },
  { label: "Integrações", href: "/#integracoes" },
  { label: "Segurança", href: "/#seguranca" },
  { label: "FAQ", href: "/#faq" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#050609]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="BrokerOn — início">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-emerald-400 font-display text-sm font-black text-white shadow-lg shadow-violet-500/20">B</span>
          <span className="font-display text-xl font-bold tracking-tight text-white">Broker<span className="text-emerald-300">On</span></span>
          <span className="hidden border-l border-white/10 pl-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600 sm:block">by Omnitheus</span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Navegação principal">
          {links.map((link) => <Link key={link.href} href={link.href} className="text-sm font-medium text-zinc-400 transition hover:text-white">{link.label}</Link>)}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <Link href="https://brokeron.omnitheus.com.br/" target="_blank" className="text-sm font-semibold text-zinc-300 transition hover:text-white">Entrar</Link>
          <Link href={whatsapp} target="_blank" className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-emerald-200">Agendar demonstração <ArrowUpRight className="ml-1.5 h-4 w-4" /></Link>
        </div>

        <button type="button" onClick={() => setOpen(!open)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-zinc-300 lg:hidden" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/[0.07] bg-[#050609] px-6 py-6 lg:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium text-zinc-300 hover:bg-white/[0.04]">{link.label}</Link>)}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-5">
              <Link href="https://brokeron.omnitheus.com.br/" target="_blank" className="rounded-full border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white">Entrar</Link>
              <Link href={whatsapp} target="_blank" className="rounded-full bg-white px-4 py-3 text-center text-sm font-bold text-zinc-950">Ver demonstração</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
