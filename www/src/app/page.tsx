"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Bot, Shield, FileSpreadsheet, Percent, Activity, QrCode,
  ArrowRight, CheckCircle2, Lock, UserCheck, RefreshCw, 
  HelpCircle, ChevronDown, Mail, Phone, ExternalLink 
} from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const stats = [
    { value: "8h+", label: "De trabalho manual economizados por dia" },
    { value: "100%", label: "Segurança com criptografia AES-256" },
    { value: "24/7", label: "Monitoramento automático de credenciais" },
    { value: "0%", label: "Erros de digitação ou perda de senhas" }
  ];

  const services = [
    {
      icon: Bot,
      title: "Gestão de Credenciais Quiver",
      desc: "Robôs inteligentes que validam acessos às seguradoras na Central de Senhas do Quiver, alertam via e-mail e atualizam credenciais inválidas automaticamente.",
      href: "/servicos/gestao-credenciais",
      color: "from-violet-500/20 to-purple-500/10",
      iconColor: "text-violet-400"
    },
    {
      icon: Shield,
      title: "Cofre de Senhas Pro",
      desc: "Armazenamento seguro de credenciais com criptografia AES ponta a ponta e controle granular de acessos por time e categoria de seguro.",
      href: "/servicos/cofre-pro",
      color: "from-emerald-500/20 to-teal-500/10",
      iconColor: "text-emerald-400"
    },
    {
      icon: QrCode,
      title: "Motor de Captação & Leads",
      desc: "Crie páginas de cotação públicas e QR Codes para capturar leads. Registre clientes canônicos e oportunidades automaticamente, com ou sem ERP.",
      href: "/servicos/captacao-leads",
      color: "from-indigo-500/20 to-violet-500/10",
      iconColor: "text-indigo-400"
    },
    {
      icon: FileSpreadsheet,
      title: "Relatórios de Vendas Automáticos",
      desc: "Extração de planilhas de produção do Quiver diretamente para seu painel, gerando um dashboard de Analytics moderno e consolidado.",
      href: "/servicos/relatorios-vendas",
      color: "from-blue-500/20 to-indigo-500/10",
      iconColor: "text-blue-400"
    },
    {
      icon: Percent,
      title: "Conciliação & Comissões",
      desc: "Robôs que monitoram comissões pendentes, recebidas e ocorrências de baixa, garantindo que nenhum centavo de comissão seja perdido.",
      href: "/servicos/conciliacao-comissoes",
      color: "from-amber-500/20 to-orange-500/10",
      iconColor: "text-amber-400"
    },
    {
      icon: Activity,
      title: "Automação de Sinistros & Clientes",
      desc: "Extração inteligente de apólices, sinistros pendentes e atualização de cadastros de clientes em lote diretamente nas seguradoras.",
      href: "/servicos/gestao-sinistros-clientes",
      color: "from-pink-500/20 to-rose-500/10",
      iconColor: "text-pink-400"
    }
  ];

  const securityFeatures = [
    {
      title: "Criptografia Simétrica Fernet",
      desc: "Nenhum dado trafega ou é armazenado em texto plano. Suas credenciais são blindadas por chaves criptográficas exclusivas por tenant.",
      icon: Lock
    },
    {
      title: "RBAC v2 - Controle de Acessos",
      desc: "Defina quem pode visualizar, editar ou revelar senhas. Crie times e vincule permissões para cada categoria de seguros (Auto, Vida, etc.).",
      icon: UserCheck
    },
    {
      title: "Sincronização Ativa com Quiver",
      desc: "Nosso robô valida a alteração, normaliza os checkboxes indeterminados de 'X' para 'S' e faz o PUT direto na API com segurança.",
      icon: RefreshCw
    }
  ];

  const faqs = [
    {
      q: "O BrokerOn substitui o Quiver?",
      a: "Não. O BrokerOn é uma ferramenta complementar de RPA (Automação de Processos) desenvolvida pelo Grupo Omnitheus que roda em segundo plano. Ele se integra ao seu Quiver para assumir as tarefas operacionais chatas e repetitivas que tomam o tempo da sua equipe."
    },
    {
      q: "Como funciona a segurança das nossas senhas?",
      a: "Utilizamos uma arquitetura de cofre digital inspirada no 1Password. Cada campo de senha cadastrado é criptografado com o algoritmo Fernet (AES-256) antes de entrar no banco de dados. A chave de criptografia fica isolada no ambiente da VPS, impedindo vazamentos."
    },
    {
      q: "O robô resolve os Captchas das seguradoras?",
      a: "Sim. Nossos robôs utilizam a API do 2captcha integrada de forma automática para resolver os reCAPTCHAs e captchas tradicionais durante a validação de credenciais no Quiver e nos portais das seguradoras."
    },
    {
      q: "Como o robô avisa sobre credenciais inválidas?",
      a: "Diariamente (ou conforme agendamento), o Robô 1 acessa o Quiver, analisa a Central de Senhas e, caso identifique alguma seguradora fora do ar ou com credencial expirada, dispara um e-mail de alerta detalhado para os contatos cadastrados da corretora."
    },
    {
      q: "Como funciona a sincronização inteligente de senha?",
      a: "Ao atualizar a senha no Cofre Pro, basta clicar em 'Sincronizar Quiver'. O Robô 3 faz o login automático, seleciona a seguradora, corrige os checkboxes indeterminados (que geralmente impedem o salvamento manual) e envia o PUT de atualização na API do Quiver."
    }
  ];

  return (
    <div className="relative isolate overflow-hidden bg-zinc-950 font-sans">
      
      {/* Decorative Gradients */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div 
          className="relative left-[calc(50%-11rem)] aspect-1155/678 w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-violet-600 to-emerald-500 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72rem]"
          style={{
            clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-24 sm:pt-24 sm:pb-32 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-300 backdrop-blur-md mb-8"
          >
            <Bot className="h-4.5 w-4.5 text-violet-400" />
            Nova Versão: Analytics de Seguros & Robôs de Automação
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl font-extrabold tracking-tight text-white font-display sm:text-6xl leading-[1.15]"
          >
            Acelere sua Corretora com a{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400">
              Automação Inteligente
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg leading-relaxed text-zinc-400 max-w-2xl mx-auto"
          >
            Com ou sem sistema de gestão, o BrokerOn (Grupo Omnitheus) centraliza sua operação. Tenha um Analytics moderno de vendas, cofre de senhas blindado e motor de captação pública de leads automática de ponta a ponta.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="https://wa.me/5511978350552?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20o%20BrokerOn!"
              target="_blank"
              className="flex w-full sm:w-auto items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-emerald-500 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-violet-500/20 hover:scale-[1.03] active:scale-[0.98] transition-all"
            >
              Agendar Demonstração Grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="#servicos"
              className="flex w-full sm:w-auto items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/60 px-8 py-4 text-base font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white hover:border-zinc-700 transition-colors"
            >
              Conhecer Serviços
            </Link>
          </motion.div>
        </div>

        {/* Floating Mockup dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 sm:mt-20 relative rounded-3xl border border-zinc-800 bg-zinc-900/40 p-4 shadow-2xl backdrop-blur-sm glow-purple"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-1/2 bg-gradient-to-r from-transparent via-violet-500 to-transparent" />
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:p-10">
            {/* Mockup UI representation */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 rounded-full bg-red-500" />
                <span className="h-3.5 w-3.5 rounded-full bg-yellow-500" />
                <span className="h-3.5 w-3.5 rounded-full bg-green-500" />
                <span className="ml-2 text-xs font-semibold text-zinc-500 tracking-wider font-display">DASHBOARD DE AUTOMAÇÃO</span>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">Ativo</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <div className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Robôs em Execução</div>
                <div className="text-3xl font-bold text-white mt-2 font-display">8 / 11</div>
                <div className="text-xs text-violet-400 mt-1 font-medium">Prontos para rodar</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <div className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Credenciais Analisadas</div>
                <div className="text-3xl font-bold text-white mt-2 font-display">147</div>
                <div className="text-xs text-emerald-400 mt-1 font-medium">Sincronizadas com o Quiver</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <div className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Horas Salvas</div>
                <div className="text-3xl font-bold text-white mt-2 font-display">240h+</div>
                <div className="text-xs text-zinc-500 mt-1 font-medium">Neste mês</div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-white font-display">Status das Credenciais no Quiver</span>
                <span className="text-xs text-zinc-500">Último scan: Hoje 08:00</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs py-2 border-b border-zinc-900">
                  <span className="font-medium text-zinc-300">Suhai Seguradora</span>
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">OK - Sincronizado</span>
                </div>
                <div className="flex items-center justify-between text-xs py-2 border-b border-zinc-900">
                  <span className="font-medium text-zinc-300">Bradesco Seguros</span>
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">OK - Sincronizado</span>
                </div>
                <div className="flex items-center justify-between text-xs py-2">
                  <span className="font-medium text-zinc-300">Allianz Seguros</span>
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">OK - Sincronizado</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats Counter Section */}
      <section className="border-y border-zinc-900 bg-zinc-950/50 py-16 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-extrabold text-white font-display md:text-5xl">{stat.value}</div>
                <p className="mt-2 text-sm text-zinc-500 font-medium leading-relaxed max-w-[180px] mx-auto">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain Point vs Solution Section */}
      <section className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-base font-semibold uppercase tracking-wider text-violet-400 font-display">O problema operacional</h2>
            <h3 className="mt-2 text-3xl font-bold text-white font-display sm:text-4xl leading-tight">
              Sua corretora gasta horas atualizando senhas e corrigindo logins bloqueados?
            </h3>
            <p className="mt-6 text-zinc-400 leading-relaxed text-base">
              Toda corretora de seguros perde tempo precioso quando as credenciais das seguradoras expiram. O funcionário tenta cotar, o login falha, é preciso redefinir a senha no portal, depois atualizar no Quiver e, muitas vezes, os checkboxes indeterminados ("amarelos") impedem a gravação correta.
            </p>
            <div className="mt-8 space-y-4">
              <div className="flex gap-3">
                <CheckCircle2 className="h-6 w-6 text-red-500 shrink-0" />
                <span className="text-zinc-300 text-sm">Operação parada por causa de credencial inválida.</span>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-6 w-6 text-red-500 shrink-0" />
                <span className="text-zinc-300 text-sm">Atualização manual e lenta de cada seguradora.</span>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-6 w-6 text-red-500 shrink-0" />
                <span className="text-zinc-300 text-sm">Bugs no Quiver (checkboxes amarelos) bloqueando a cotação.</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/25 p-8 relative overflow-hidden glow-emerald">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
            
            <h3 className="text-2xl font-bold text-white font-display mb-6">A Solução: RPA BrokerOn</h3>
            <ul className="space-y-6">
              <li className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Bot className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-white">Robôs de Verificação Automática</h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Testamos todos os acessos diariamente às 08:00. Identificamos falhas de login e disparamos e-mails imediatos para os gestores.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <RefreshCw className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-white">Sincronização Ativa de Senhas</h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Você digita a nova senha no cofre seguro e o robô atualiza no Quiver via API, normalizando os checkboxes com status "X" para "S".
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Shield className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-white">Segurança Criptografada Homologada</h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Os robôs salvam o token da sessão, removem rastros do Angular e fazem o PUT direto e seguro na API do Quiver.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section id="servicos" className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 relative scroll-mt-20">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 className="text-base font-semibold uppercase tracking-wider text-violet-400 font-display">Robôs Sob Medida</h2>
          <h3 className="mt-2 text-3xl font-bold text-white font-display sm:text-4xl">
            Soluções completas de automação para corretoras
          </h3>
          <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
            Nossos robôs cobrem desde a segurança das credenciais até a automação financeira e de sinistros no Quiver.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -6 }}
              className="group relative flex flex-col justify-between rounded-3xl border border-zinc-800 bg-zinc-900/20 p-8 hover:border-zinc-700/80 transition-all duration-300"
            >
              <div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr ${service.color} ${service.iconColor} mb-6 border border-zinc-800`}>
                  <service.icon className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-white font-display group-hover:text-violet-400 transition-colors">
                  {service.title}
                </h4>
                <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                  {service.desc}
                </p>
              </div>

              <div className="mt-8 border-t border-zinc-800/60 pt-6">
                <Link 
                  href={service.href} 
                  className="inline-flex items-center gap-1 text-xs font-semibold text-violet-400 hover:text-violet-300 group-hover:translate-x-1 transition-all"
                >
                  Ver Detalhes do Serviço
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Security Focus Section */}
      <section id="seguranca" className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 border-t border-zinc-900 scroll-mt-20">
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 md:p-16 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-violet-600/5 blur-3xl pointer-events-none" />
          
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-md mb-6">
                <Shield className="h-4 w-4 text-emerald-400" />
                Segurança em Primeiro Lugar
              </div>
              <h3 className="text-3xl font-bold text-white font-display sm:text-4xl">
                Criptografia e Isolamento de Dados Conforme a LGPD
              </h3>
              <p className="mt-6 text-zinc-400 leading-relaxed">
                Entendemos que as credenciais das seguradoras são o coração da sua corretora. Por isso, desenhamos o BrokerOn seguindo as melhores práticas de cibersegurança globais.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  href="mailto:contato@omniheus.com.br?subject=Duvidas%20sobre%20seguranca%20BrokerOn"
                  className="flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/60 px-6 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white transition-all"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email de Suporte Técnico
                </Link>
              </div>
            </div>

            <div className="grid gap-6">
              {securityFeatures.map((feat, i) => (
                <div key={i} className="flex gap-4 p-5 rounded-2xl border border-zinc-800/80 bg-zinc-950/40">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-violet-400">
                    <feat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{feat.title}</h4>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 border-t border-zinc-900 scroll-mt-20">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <HelpCircle className="mx-auto h-8 w-8 text-violet-400" />
          <h2 className="mt-4 text-3xl font-bold text-white font-display sm:text-4xl">
            Perguntas Frequentes
          </h2>
          <p className="mt-4 text-zinc-400">
            Tire suas dúvidas sobre o funcionamento do BrokerOn na sua corretora.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-4">
          {faqs.map((faq, i) => (
            <div 
              key={i} 
              className="rounded-2xl border border-zinc-800 bg-zinc-900/10 overflow-hidden transition-all duration-300"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-5 text-left text-white hover:bg-zinc-900/30 transition-colors focus:outline-none"
              >
                <span className="font-semibold text-sm sm:text-base font-display">{faq.q}</span>
                <ChevronDown className={`h-5 w-5 text-zinc-400 transition-transform duration-200 shrink-0 ${activeFaq === i ? "rotate-180 text-violet-400" : ""}`} />
              </button>
              
              {activeFaq === i && (
                <div className="px-6 pb-5 border-t border-zinc-900 text-sm text-zinc-400 leading-relaxed pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Conversion Section */}
      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-r from-violet-900/30 via-zinc-950 to-emerald-950/20 p-8 md:p-16 text-center relative overflow-hidden glow-purple">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.05),transparent_70%)]" />
          
          <h3 className="text-3xl font-bold text-white font-display sm:text-4xl">
            Pronto para transformar a operação da sua corretora?
          </h3>
          <p className="mt-4 text-zinc-400 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Comece a economizar tempo de equipe e garanta que suas cotações no Quiver nunca fiquem travadas por credenciais expiradas.
          </p>
          
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="https://wa.me/5511978350552?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20o%20BrokerOn!"
              target="_blank"
              className="flex w-full sm:w-auto items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-emerald-500 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-violet-500/25 hover:scale-[1.02] transition-all"
            >
              Chamar no WhatsApp
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
            <a
              href="mailto:contato@omniheus.com.br"
              className="flex w-full sm:w-auto items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/60 px-8 py-4 text-base font-semibold text-zinc-300 hover:text-white transition-colors"
            >
              Falar via E-mail
            </a>
          </div>

          <div className="mt-8 text-xs text-zinc-500 font-medium">
            Contato rápido: (11) 97835-0552 | Escritório: R. Pais Leme, 215, Conj. 1713 - Pinheiros, São Paulo - SP
          </div>
        </div>
      </section>

    </div>
  );
}
