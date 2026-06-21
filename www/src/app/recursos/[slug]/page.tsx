import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronRight, MessageCircle, Sparkles } from "lucide-react";
import { getRecurso, getRelacionados, recursos } from "@/content/recursos";

const baseUrl = "https://brokeron.com.br";
const whatsapp = "https://wa.me/5511985266582?text=Olá,%20quero%20conhecer%20este%20recurso%20do%20BrokerOn.";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return recursos.map((recurso) => ({ slug: recurso.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const recurso = getRecurso(slug);
  if (!recurso) return {};

  return {
    title: recurso.seoTitle,
    description: recurso.descricao,
    alternates: { canonical: `/recursos/${recurso.slug}` },
    openGraph: {
      type: "website",
      url: `/recursos/${recurso.slug}`,
      title: `${recurso.seoTitle} | BrokerOn`,
      description: recurso.descricao,
    },
    twitter: {
      card: "summary",
      title: recurso.seoTitle,
      description: recurso.descricao,
    },
  };
}

export default async function RecursoPage({ params }: Props) {
  const { slug } = await params;
  const recurso = getRecurso(slug);
  if (!recurso) notFound();
  const relacionados = getRelacionados(recurso);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "BrokerOn", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Recursos", item: `${baseUrl}/recursos` },
      { "@type": "ListItem", position: 3, name: recurso.titulo, item: `${baseUrl}/recursos/${recurso.slug}` },
    ],
  };

  return (
    <main className="bg-[#050609] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} />

      <section className="relative overflow-hidden border-b border-white/[0.07] px-6 py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.15),transparent_35%),radial-gradient(circle_at_85%_30%,rgba(16,185,129,0.08),transparent_25%)]" />
        <div className="relative mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="mb-10 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
            <Link href="/" className="hover:text-white">Início</Link><ChevronRight className="h-3 w-3" />
            <Link href="/recursos" className="hover:text-white">Recursos</Link><ChevronRight className="h-3 w-3" />
            <span className="text-zinc-400">{recurso.titulo}</span>
          </nav>
          <div className="grid gap-10 lg:grid-cols-[1fr_.38fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">{recurso.categoria} · BrokerOn</p>
              <h1 className="mt-5 max-w-4xl font-display text-4xl font-bold tracking-tight sm:text-6xl">{recurso.titulo}</h1>
              <p className="mt-6 max-w-3xl text-xl leading-8 text-zinc-300">{recurso.promessa}</p>
              <p className="mt-4 max-w-3xl leading-7 text-zinc-500">{recurso.descricao}</p>
            </div>
            <Link href={whatsapp} target="_blank" className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-bold text-zinc-950 transition hover:bg-emerald-200">Ver em uma demonstração <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-2">
          <article className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-300">O desafio</p>
            <h2 className="mt-4 font-display text-2xl font-bold">Por que esse processo merece atenção?</h2>
            <p className="mt-5 leading-7 text-zinc-400">{recurso.problema}</p>
          </article>
          <article className="rounded-3xl border border-emerald-300/15 bg-emerald-300/[0.035] p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Com o BrokerOn</p>
            <h2 className="mt-4 font-display text-2xl font-bold">Uma rotina mais clara e conectada</h2>
            <p className="mt-5 leading-7 text-zinc-300">{recurso.solucao}</p>
          </article>
        </div>
      </section>

      <section className="border-y border-white/[0.07] bg-[#080a0f] px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">Benefícios operacionais</p>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">O que muda no dia a dia da corretora</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {recurso.beneficios.map((beneficio) => <div key={beneficio} className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 text-sm font-medium text-zinc-300"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/10"><Check className="h-4 w-4 text-emerald-300" /></span>{beneficio}</div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Como funciona</p>
        <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Do processo disperso a uma rotina acompanhável</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {recurso.etapas.map((etapa, index) => <article key={etapa.titulo} className="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] p-7"><span className="text-4xl font-black text-white/[0.07]">0{index + 1}</span><h3 className="mt-5 font-display text-lg font-bold">{etapa.titulo}</h3><p className="mt-3 text-sm leading-6 text-zinc-500">{etapa.texto}</p></article>)}
        </div>
      </section>

      <section className="border-y border-white/[0.07] bg-white/[0.018] px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[.55fr_1fr]">
          <div><Sparkles className="h-7 w-7 text-violet-300" /><h2 className="mt-5 font-display text-3xl font-bold">Perguntas frequentes</h2><p className="mt-4 text-sm leading-6 text-zinc-500">Respostas diretas sobre este recurso e sua aplicação na corretora.</p></div>
          <div className="space-y-5">
            {recurso.faq.map((item) => <article key={item.pergunta} className="border-b border-white/[0.08] pb-5 last:border-0"><h3 className="font-display font-bold">{item.pergunta}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{item.resposta}</p></article>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-8 flex items-end justify-between gap-6"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">Continue explorando</p><h2 className="mt-3 font-display text-2xl font-bold">Recursos relacionados</h2></div><Link href="/recursos" className="hidden text-sm font-bold text-zinc-400 hover:text-white sm:inline-flex">Ver todos <ArrowRight className="ml-2 h-4 w-4" /></Link></div>
        <div className="grid gap-5 md:grid-cols-3">
          {relacionados.map((item) => <Link key={item.slug} href={`/recursos/${item.slug}`} className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 transition hover:border-violet-400/30"><span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">{item.categoria}</span><h3 className="mt-3 font-display font-bold group-hover:text-violet-300">{item.titulo}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{item.descricao}</p></Link>)}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="rounded-[2rem] bg-white px-8 py-12 text-center text-zinc-950 sm:px-12">
          <h2 className="font-display text-3xl font-bold">Veja este recurso aplicado à sua operação</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-600">Uma demonstração objetiva, usando o contexto e os gargalos reais da sua corretora.</p>
          <Link href={whatsapp} target="_blank" className="mt-7 inline-flex items-center rounded-full bg-zinc-950 px-6 py-3 text-sm font-bold text-white hover:bg-violet-700">Conversar com um especialista <MessageCircle className="ml-2 h-4 w-4" /></Link>
        </div>
        <Link href="/recursos" className="mt-8 inline-flex items-center text-sm text-zinc-500 hover:text-white"><ArrowLeft className="mr-2 h-4 w-4" />Voltar para todos os recursos</Link>
      </section>
    </main>
  );
}
