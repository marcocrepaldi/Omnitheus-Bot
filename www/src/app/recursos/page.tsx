import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Bot, BriefcaseBusiness, CircleDollarSign, LockKeyhole, Target } from "lucide-react";
import { categorias, recursos } from "@/content/recursos";

export const metadata: Metadata = {
  title: "Recursos para Corretoras de Seguros",
  description: "Conheça os recursos do BrokerOn para captação, vendas, carteira, renovações, comissões, sinistros, analytics, automação e governança.",
  alternates: { canonical: "/recursos" },
  openGraph: {
    title: "Recursos do BrokerOn para Corretoras de Seguros",
    description: "Uma plataforma conectada para organizar vendas, operação, receita e inteligência da corretora.",
    url: "/recursos",
  },
};

const categoryIcons = {
  Vendas: Target,
  Operação: BriefcaseBusiness,
  Financeiro: CircleDollarSign,
  Inteligência: BarChart3,
  Automação: Bot,
  Governança: LockKeyhole,
};

export default function RecursosPage() {
  return (
    <main className="bg-[#050609] text-white">
      <section className="border-b border-white/[0.07] px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Explore o BrokerOn</p>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-6xl">Recursos para transformar a operação da sua corretora</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-400">Da primeira oportunidade à renovação, cada módulo foi pensado para reduzir retrabalho, organizar responsabilidades e transformar dados em ação.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        {categorias.map((categoria) => {
          const itens = recursos.filter((recurso) => recurso.categoria === categoria);
          if (!itens.length) return null;
          const Icon = categoryIcons[categoria];
          return (
            <section key={categoria} className="mb-20 last:mb-0" aria-labelledby={`categoria-${categoria}`}>
              <div className="mb-8 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]"><Icon className="h-5 w-5 text-violet-300" /></span>
                <h2 id={`categoria-${categoria}`} className="font-display text-2xl font-bold">{categoria}</h2>
                <span className="text-xs text-zinc-600">{itens.length} recursos</span>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {itens.map((recurso) => (
                  <Link key={recurso.slug} href={`/recursos/${recurso.slug}`} className="group flex min-h-64 flex-col justify-between rounded-3xl border border-white/[0.08] bg-white/[0.025] p-7 transition hover:-translate-y-1 hover:border-violet-400/30 hover:bg-white/[0.04]">
                    <div>
                      {recurso.destaque && <span className="mb-5 inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Destaque</span>}
                      <h3 className="font-display text-xl font-bold group-hover:text-violet-300">{recurso.titulo}</h3>
                      <p className="mt-3 text-sm leading-6 text-zinc-500">{recurso.descricao}</p>
                    </div>
                    <span className="mt-8 inline-flex items-center text-xs font-bold text-zinc-300">Conhecer recurso <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" /></span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
