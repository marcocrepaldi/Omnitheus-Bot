"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown, Bot, Shield, FileSpreadsheet, Percent, Activity, QrCode } from "lucide-react";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);

  const services = [
    {
      name: "Gestão de Credenciais Quiver",
      desc: "Verificação automática e normalização de status.",
      href: "/servicos/gestao-credenciais",
      icon: Bot,
    },
    {
      name: "Cofre de Senhas Pro",
      desc: "Segurança de nível militar com criptografia AES.",
      href: "/servicos/cofre-pro",
      icon: Shield,
    },
    {
      name: "Relatórios de Vendas",
      desc: "Análise de planilhas e relatórios automatizados.",
      href: "/servicos/relatorios-vendas",
      icon: FileSpreadsheet,
    },
    {
      name: "Conciliação & Comissões",
      desc: "Auditoria de recebimentos e baixas no Quiver.",
      href: "/servicos/conciliacao-comissoes",
      icon: Percent,
    },
    {
      name: "Sinistros & Clientes",
      desc: "Automação de operações no dia a dia da corretora.",
      href: "/servicos/gestao-sinistros-clientes",
      icon: Activity,
    },
    {
      name: "Captação de Leads",
      desc: "Páginas de cotação públicas e capture oportunidades.",
      href: "/servicos/captacao-leads",
      icon: QrCode,
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white font-display">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-emerald-500 text-white shadow-lg shadow-violet-500/25">
            B
          </span>
          <span>
            Broker<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400">On</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm font-medium text-zinc-300 transition-colors hover:text-white">
            Home
          </Link>
          
          {/* Services Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsServicesOpen(!isServicesOpen)}
              onMouseEnter={() => setIsServicesOpen(true)}
              className="flex items-center gap-1 text-sm font-medium text-zinc-300 transition-colors hover:text-white focus:outline-none"
            >
              Serviços
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isServicesOpen ? "rotate-180" : ""}`} />
            </button>

            {isServicesOpen && (
              <div
                onMouseLeave={() => setIsServicesOpen(false)}
                className="absolute left-1/2 top-full z-50 mt-3 w-80 -translate-x-1/2 rounded-2xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
              >
                {services.map((service) => (
                  <Link
                    key={service.name}
                    href={service.href}
                    onClick={() => setIsServicesOpen(false)}
                    className="flex items-start gap-3 rounded-xl p-3 hover:bg-zinc-800/60 transition-colors"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-violet-400">
                      <service.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{service.name}</div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{service.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/#seguranca" className="text-sm font-medium text-zinc-300 transition-colors hover:text-white">
            Segurança
          </Link>
          <Link href="/#faq" className="text-sm font-medium text-zinc-300 transition-colors hover:text-white">
            FAQ
          </Link>
        </nav>

        {/* CTA Button */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="https://wa.me/5511978350552?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20o%20BrokerOn!"
            target="_blank"
            className="relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none"
          >
            Falar com Especialista
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white md:hidden"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="border-t border-zinc-800 bg-zinc-950 px-6 py-4 md:hidden animate-in fade-in slide-in-from-top-5 duration-200">
          <nav className="flex flex-col gap-4">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="text-base font-medium text-zinc-300 hover:text-white"
            >
              Home
            </Link>
            
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Serviços</span>
              <div className="grid gap-3 pl-2 border-l border-zinc-800">
                {services.map((service) => (
                  <Link
                    key={service.name}
                    href={service.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-white"
                  >
                    <service.icon className="h-4 w-4 text-violet-400" />
                    {service.name}
                  </Link>
                ))}
              </div>
            </div>

            <Link
              href="/#seguranca"
              onClick={() => setIsOpen(false)}
              className="text-base font-medium text-zinc-300 hover:text-white"
            >
              Segurança
            </Link>
            <Link
              href="/#faq"
              onClick={() => setIsOpen(false)}
              className="text-base font-medium text-zinc-300 hover:text-white"
            >
              FAQ
            </Link>

            <Link
              href="https://wa.me/5511978350552?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20o%20BrokerOn!"
              target="_blank"
              onClick={() => setIsOpen(false)}
              className="mt-4 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-emerald-500 py-3 text-sm font-semibold text-white shadow-lg"
            >
              Falar com Especialista
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
