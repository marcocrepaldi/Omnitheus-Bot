"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  KeyRound,
  Layers3,
  Lightbulb,
  LockKeyhole,
  MessageCircle,
  PieChart,
  QrCode,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Workflow,
} from "lucide-react";
import { useState } from "react";

const whatsapp =
  "https://wa.me/5511985266582?text=Olá,%20quero%20conhecer%20a%20plataforma%20BrokerOn%20para%20minha%20corretora.";

const pillars = [
  {
    eyebrow: "Comercial",
    title: "Venda mais, sem perder oportunidades pelo caminho",
    description:
      "Capture leads, organize o funil, acompanhe cotações e mantenha cada follow-up no radar da equipe.",
    icon: Target,
    color: "violet",
    items: ["Links e QR Codes de captação", "Funil de oportunidades", "Cotações, propostas e follow-ups"],
  },
  {
    eyebrow: "Operação",
    title: "Tenha a rotina inteira da corretora sob controle",
    description:
      "Centralize clientes, apólices, documentos, tarefas, renovações e sinistros em um fluxo operacional claro.",
    icon: Workflow,
    color: "cyan",
    items: ["Carteira e visão 360°", "Tarefas e checklists", "Renovações e sinistros"],
  },
  {
    eyebrow: "Receita",
    title: "Proteja comissões e encontre espaço para crescer",
    description:
      "Acompanhe pendências, repasses e oportunidades de cross-sell antes que receita importante escape.",
    icon: CircleDollarSign,
    color: "amber",
    items: ["Comissões e repasses", "Gaps de carteira", "Retenção e novas ofertas"],
  },
  {
    eyebrow: "Inteligência",
    title: "Decida com dados que a equipe consegue usar",
    description:
      "Transforme a movimentação da corretora em indicadores, alertas e próximos passos acionáveis.",
    icon: Lightbulb,
    color: "emerald",
    items: ["Dashboards operacionais", "Indicadores de produção", "Insights e análises com IA"],
  },
];

const modules = [
  { icon: QrCode, title: "Captação e CRM", text: "Leads, oportunidades, funil e acompanhamento comercial.", href: "/recursos/captacao-de-leads-para-corretoras" },
  { icon: BriefcaseBusiness, title: "Carteira 360°", text: "Clientes, apólices, produtos, seguradoras e histórico reunidos.", href: "/recursos/carteira-de-clientes-para-corretoras" },
  { icon: RefreshCcw, title: "Renovações", text: "Prazos, prioridades, responsáveis e ações de retenção.", href: "/recursos/renovacao-de-seguros" },
  { icon: CircleDollarSign, title: "Comissões", text: "Pendências, baixas, repasses e divergências financeiras.", href: "/recursos/gestao-de-comissoes-de-seguros" },
  { icon: Activity, title: "Sinistros e saúde", text: "Acompanhamento operacional, saúde e sinistralidade da carteira.", href: "/recursos/gestao-de-sinistros" },
  { icon: PieChart, title: "Analytics", text: "Produção, conversão, ticket, perdas e performance comercial.", href: "/recursos/dashboard-de-vendas-para-corretoras" },
  { icon: KeyRound, title: "Cofre de acessos", text: "Credenciais protegidas, categorizadas e auditadas por equipe.", href: "/recursos/cofre-de-senhas-para-corretoras" },
  { icon: Bot, title: "Automações", text: "Robôs agendados, alertas e processos repetitivos em segundo plano.", href: "/recursos/automacao-para-corretoras-de-seguros" },
];

const faqs = [
  {
    q: "Preciso usar o Quiver para contratar o BrokerOn?",
    a: "Não. O BrokerOn funciona como plataforma operacional da corretora mesmo sem Quiver. Quando a corretora já usa o sistema, conectamos os dados disponíveis para ampliar a visão gerencial e automatizar rotinas.",
  },
  {
    q: "O BrokerOn substitui meu sistema de gestão?",
    a: "Depende do cenário da corretora. Ele pode centralizar a operação comercial e operacional ou atuar como uma camada moderna de inteligência, automação e controle sobre o sistema que você já utiliza.",
  },
  {
    q: "É possível liberar acessos diferentes para cada pessoa?",
    a: "Sim. Perfis, times e permissões permitem controlar módulos, categorias e ações sensíveis. A corretora define quem pode visualizar, editar ou revelar cada informação.",
  },
  {
    q: "A implantação muda a rotina da equipe de uma vez?",
    a: "Não precisa. A entrada pode ser feita por etapas, começando pelo maior gargalo — comercial, carteira, comissões, credenciais ou relatórios — e evoluindo conforme a equipe ganha ritmo.",
  },
  {
    q: "Vocês desenvolvem novas integrações e automações?",
    a: "Sim. Mapeamos a rotina da corretora e priorizamos integrações e automações que reduzam retrabalho, melhorem a qualidade dos dados e gerem retorno operacional mensurável.",
  },
];

export default function Home() {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  return (
    <div className="relative isolate overflow-hidden bg-[#050609] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[760px] bg-[radial-gradient(circle_at_20%_10%,rgba(124,58,237,0.18),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(16,185,129,0.12),transparent_30%)]" />

      <section className="mx-auto max-w-7xl px-6 pb-24 pt-16 sm:pt-24 lg:px-8 lg:pb-32">
        <div className="grid items-center gap-14 lg:grid-cols-[1.02fr_.98fr]">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-2 text-xs font-semibold text-emerald-300">
              <Sparkles className="h-4 w-4" />
              Tecnologia para a nova geração de corretoras
            </div>
            <h1 className="max-w-3xl font-display text-4xl font-bold tracking-[-0.04em] sm:text-6xl lg:text-[4.25rem] lg:leading-[1.02]">
              Toda a operação da sua corretora,
              <span className="block bg-gradient-to-r from-violet-400 via-fuchsia-300 to-emerald-300 bg-clip-text text-transparent">
                finalmente conectada.
              </span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400">
              O BrokerOn reúne vendas, carteira, renovações, comissões e atendimento em uma plataforma feita para transformar rotina operacional em crescimento previsível.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={whatsapp} target="_blank" className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-sm font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-emerald-200">
                Agendar demonstração <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="#plataforma" className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.07]">
                Explorar a plataforma
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-zinc-500">
              {["Implantação por etapas", "Acesso por perfil e time", "Com ou sem sistema de gestão"].map((item) => (
                <span key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" />{item}</span>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.15 }} className="relative">
            <div className="absolute -inset-8 -z-10 rounded-full bg-violet-600/10 blur-3xl" />
            <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0a0c11] shadow-2xl shadow-black/60">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" /></div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Visão executiva</span>
                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">Atualizado</span>
              </div>
              <div className="p-5 sm:p-7">
                <div className="mb-6 flex items-start justify-between">
                  <div><p className="text-xs text-zinc-500">Bom dia, equipe</p><h2 className="mt-1 font-display text-xl font-semibold">Sua corretora hoje</h2></div>
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5"><BarChart3 className="h-5 w-5 text-violet-300" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Produção do mês" value="R$ 284 mil" note="+12,4% no período" tone="emerald" />
                  <Metric label="Oportunidades" value="38 abertas" note="9 pedem atenção" tone="violet" />
                  <Metric label="Renovações" value="24 próximas" note="Próximos 30 dias" tone="amber" />
                  <Metric label="Comissões" value="R$ 31,8 mil" note="A conciliar" tone="cyan" />
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-[1.15fr_.85fr]">
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                    <div className="mb-4 flex items-center justify-between"><span className="text-xs font-semibold">Produção por mês</span><span className="text-[10px] text-zinc-600">Últimos 6 meses</span></div>
                    <div className="flex h-28 items-end gap-2">
                      {[42, 55, 48, 67, 63, 88].map((height, index) => <div key={index} className="flex-1 rounded-t-md bg-gradient-to-t from-violet-600/30 to-violet-400" style={{ height: `${height}%` }} />)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                    <span className="text-xs font-semibold">Prioridades</span>
                    <div className="mt-4 space-y-3">
                      <Priority color="bg-rose-400" text="5 renovações críticas" />
                      <Priority color="bg-amber-300" text="9 follow-ups hoje" />
                      <Priority color="bg-emerald-400" text="3 oportunidades novas" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-white/[0.07] bg-white/[0.018] py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6 text-center text-sm text-zinc-500 lg:justify-between lg:px-8">
          <span className="font-semibold text-zinc-300">Uma base única para:</span>
          {[
            [Users, "Clientes"], [Target, "Vendas"], [FileCheck2, "Apólices"], [RefreshCcw, "Renovações"], [CircleDollarSign, "Comissões"], [Activity, "Sinistros"],
          ].map(([Icon, label]) => {
            const ItemIcon = Icon as typeof Users;
            return <span key={label as string} className="flex items-center gap-2"><ItemIcon className="h-4 w-4 text-violet-400" />{label as string}</span>;
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">A operação cresceu. E agora?</p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl">Planilhas e mensagens não deveriam comandar sua corretora.</h2>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-zinc-400">
            Quando informações ficam espalhadas entre WhatsApp, portais, planilhas e sistemas que não conversam, a equipe trabalha muito e enxerga pouco. O BrokerOn organiza essa complexidade em uma rotina simples, mensurável e compartilhada.
          </p>
        </div>
      </section>

      <section id="plataforma" className="scroll-mt-24 border-y border-white/[0.07] bg-[#080a0f] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Da oportunidade à renovação</p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl">Uma plataforma para cada decisão da operação</h2>
            <p className="mt-5 text-lg text-zinc-400">Menos retrabalho para a equipe. Mais clareza para quem gerencia. Mais atenção para o cliente.</p>
          </div>
          <div className="mt-16 grid gap-5 lg:grid-cols-2">
            {pillars.map((pillar) => (
              <article key={pillar.eyebrow} className="group rounded-3xl border border-white/[0.08] bg-white/[0.025] p-7 transition hover:-translate-y-1 hover:border-white/[0.16] sm:p-9">
                <div className="flex items-start gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"><pillar.icon className="h-6 w-6 text-violet-300" /></div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{pillar.eyebrow}</p>
                    <h3 className="mt-2 font-display text-xl font-bold sm:text-2xl">{pillar.title}</h3>
                  </div>
                </div>
                <p className="mt-5 leading-7 text-zinc-400">{pillar.description}</p>
                <ul className="mt-6 grid gap-3 sm:grid-cols-3">
                  {pillar.items.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-zinc-300"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />{item}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="modulos" className="scroll-mt-24 mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">Módulos conectados</p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">Comece pelo seu maior gargalo. Evolua sem reconstruir tudo.</h2>
            <p className="mt-5 leading-7 text-zinc-400">A implantação pode acontecer por etapas. Cada módulo resolve uma parte da rotina e alimenta uma visão unificada da corretora.</p>
            <Link href={whatsapp} target="_blank" className="mt-8 inline-flex items-center text-sm font-bold text-emerald-300 hover:text-emerald-200">Descobrir por onde começar <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {modules.map((module) => (
              <Link key={module.title} href={module.href} className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:-translate-y-1 hover:border-violet-400/30">
                <module.icon className="h-5 w-5 text-violet-300" />
                <h3 className="mt-4 font-display font-bold group-hover:text-violet-300">{module.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{module.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="integracoes" className="scroll-mt-24 mx-auto max-w-7xl px-6 pb-24 sm:pb-32 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-violet-400/20 bg-gradient-to-br from-violet-950/50 via-[#0b0d13] to-emerald-950/30 p-8 sm:p-12 lg:p-16">
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative grid gap-12 lg:grid-cols-[1fr_.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/[0.07] px-3 py-1.5 text-xs font-semibold text-violet-200"><Layers3 className="h-4 w-4" /> Integrações que ampliam o que você já tem</div>
              <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-5xl">Já usa Quiver? Transformamos seus dados em ação.</h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">O BrokerOn complementa o Quiver com uma camada mais visual e operacional: centraliza indicadores, monitora rotinas, encontra oportunidades e automatiza processos repetitivos.</p>
              <p className="mt-4 text-sm leading-6 text-zinc-500">E se sua corretora não usa Quiver, tudo bem: a plataforma também funciona de forma independente e pode receber dados de outras fontes.</p>
            </div>
            <div className="space-y-3">
              {[
                [BarChart3, "Dashboards modernos", "Produção, conversão, carteira e performance em uma leitura clara."],
                [Sparkles, "Insights operacionais", "Sinais e prioridades que os relatórios tradicionais não destacam."],
                [Bot, "Automação de rotina", "Credenciais, relatórios, comissões e tarefas executadas com consistência."],
              ].map(([Icon, title, text]) => {
                const ItemIcon = Icon as typeof BarChart3;
                return <div key={title as string} className="flex gap-4 rounded-2xl border border-white/[0.08] bg-black/20 p-5"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]"><ItemIcon className="h-5 w-5 text-emerald-300" /></div><div><h3 className="text-sm font-bold">{title as string}</h3><p className="mt-1 text-xs leading-5 text-zinc-400">{text as string}</p></div></div>;
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="seguranca" className="scroll-mt-24 border-y border-white/[0.07] bg-white/[0.018] py-24">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Governança desde a base</p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl">Informação acessível para quem precisa. Protegida de quem não precisa.</h2>
            <p className="mt-6 text-lg leading-8 text-zinc-400">Dados de clientes e credenciais exigem controle real. O BrokerOn combina isolamento por corretora, permissões detalhadas e rastreabilidade das ações sensíveis.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              [LockKeyhole, "Credenciais protegidas", "Campos sensíveis são armazenados de forma criptografada."],
              [Users, "Perfis e times", "Cada pessoa acessa somente os módulos e ações necessários."],
              [ClipboardCheck, "Trilha de auditoria", "Revelações, alterações e outras ações sensíveis ficam registradas."],
              [Building2, "Dados isolados", "Arquitetura multiempresa mantém as informações de cada corretora separadas."],
            ].map(([Icon, title, text]) => {
              const ItemIcon = Icon as typeof LockKeyhole;
              return <div key={title as string} className="rounded-2xl border border-white/[0.08] bg-[#080a0f] p-5"><ItemIcon className="h-5 w-5 text-emerald-300" /><h3 className="mt-4 text-sm font-bold">{title as string}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{text as string}</p></div>;
            })}
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">Perguntas frequentes</p><h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">O que sua equipe precisa saber antes de começar</h2></div>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div key={faq.q} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                <button onClick={() => setActiveFaq(activeFaq === index ? null : index)} className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left text-sm font-semibold hover:bg-white/[0.025]" aria-expanded={activeFaq === index}>
                  {faq.q}<ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition ${activeFaq === index ? "rotate-180" : ""}`} />
                </button>
                {activeFaq === index && <p className="border-t border-white/[0.06] px-6 py-5 text-sm leading-7 text-zinc-400">{faq.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white px-8 py-14 text-center text-zinc-950 sm:px-12 sm:py-16">
          <ShieldCheck className="mx-auto h-9 w-9 text-violet-600" />
          <h2 className="mx-auto mt-5 max-w-3xl font-display text-3xl font-bold tracking-tight sm:text-5xl">Sua corretora não precisa de mais uma tela. Precisa de uma operação que funciona.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-zinc-600">Conte onde sua equipe perde mais tempo. Nós mostramos como transformar esse gargalo em um fluxo claro, conectado e mensurável.</p>
          <Link href={whatsapp} target="_blank" className="mt-8 inline-flex items-center justify-center rounded-full bg-zinc-950 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-violet-700">Conversar com um especialista <MessageCircle className="ml-2 h-4 w-4" /></Link>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone: "emerald" | "violet" | "amber" | "cyan" }) {
  const colors = { emerald: "text-emerald-300", violet: "text-violet-300", amber: "text-amber-300", cyan: "text-cyan-300" };
  return <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"><p className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</p><p className="mt-2 font-display text-lg font-bold sm:text-xl">{value}</p><p className={`mt-1 text-[10px] ${colors[tone]}`}>{note}</p></div>;
}

function Priority({ color, text }: { color: string; text: string }) {
  return <div className="flex items-center gap-2 text-[10px] text-zinc-400"><span className={`h-1.5 w-1.5 rounded-full ${color}`} />{text}</div>;
}
