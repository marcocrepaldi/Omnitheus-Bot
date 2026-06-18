import type { Metadata } from "next";
import Link from "next/link";
import { QrCode, Share2, BarChart3, Users2, ArrowLeft, Mail, MessageSquare, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Motor de Captação de Leads e Oportunidades | BrokerOn",
  description: "Crie páginas de cotação públicas e QR Codes para captar novos clientes. O BrokerOn organiza seus leads, gera oportunidades e fornece insights completos.",
  alternates: {
    canonical: "/servicos/captacao-leads",
  },
};

export default function CaptacaoLeadsPage() {
  const steps = [
    {
      title: "Geração de Links & QR Codes",
      desc: "Gere links personalizados em segundos para diferentes ramos (Auto, Vida, Saúde, etc.) e vincule a produtores específicos da sua corretora.",
      icon: QrCode
    },
    {
      title: "Página Pública de Cotação",
      desc: "Seus clientes acessam um formulário elegante no link público `/l/[token]`, preenchendo as informações necessárias de forma intuitiva.",
      icon: Share2
    },
    {
      title: "Cadastro Automático no Pipeline",
      desc: "Cada submissão cria automaticamente um registro de cliente canônico e uma oportunidade no funil de vendas, sem digitação manual.",
      icon: Users2
    },
    {
      title: "Analytics e Funil de Conversão",
      desc: "Acompanhe visualmente as taxas de visualização, preenchimento e fechamento por link de captação e por produtor.",
      icon: BarChart3
    }
  ];

  return (
    <div className="bg-zinc-950 py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-6">
        
        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar para a Home
        </Link>

        {/* Hero header */}
        <div className="flex flex-col gap-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-zinc-800">
            <QrCode className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display sm:text-5xl">
            Motor de Captação Pública de Leads
          </h1>
          <p className="text-lg leading-relaxed text-zinc-400 mt-2">
            Mesmo que sua corretora não utilize nenhum ERP de gestão, o BrokerOn funciona como um centralizador de leads e oportunidades de vendas moderno e inteligente.
          </p>
        </div>

        {/* Dynamic content sections */}
        <div className="mt-12 space-y-12 border-t border-zinc-900 pt-12">
          
          <section>
            <h2 className="text-xl font-bold text-white font-display mb-6">Como funciona o Funil de Captação</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {steps.map((step, i) => (
                <div key={i} className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/20">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-indigo-400 mb-4">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-white font-display">{step.title}</h3>
                  <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-zinc-900 pt-12">
            <div>
              <h2 className="text-xl font-bold text-white font-display">Para corretoras com ou sem sistema</h2>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                Desenvolvemos o BrokerOn com o foco em inteligência e simplificação de processos. Se você usa o Quiver, os dados captados podem ser sincronizados e aproveitados pelos robôs operacionais.
              </p>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                Se você não usa nenhum sistema tradicional, o BrokerOn atua como seu <strong>ERP inteligente de captação e analytics</strong>, permitindo que você gerencie seus clientes, visualize oportunidades de cross-selling e crie campanhas de marketing estruturadas.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 flex flex-col justify-center">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-display mb-4">Resultados Imediatos</h3>
              <div className="space-y-3 text-xs">
                <div className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-zinc-300">Páginas de cotação prontas para rodar anúncios no Instagram/Google.</span>
                </div>
                <div className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-zinc-300">Organização automática por ramos de seguro (Auto, Vida, RE).</span>
                </div>
                <div className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-zinc-300">Histórico de acessos e desempenho de vendas consolidado.</span>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Conversion Section */}
          <section className="border-t border-zinc-900 pt-16 text-center">
            <h3 className="text-2xl font-bold text-white font-display">Transforme sua captação de clientes</h3>
            <p className="text-zinc-400 mt-2 max-w-lg mx-auto text-sm">
              Crie links públicos, divulgue nas redes sociais ou em campanhas locais e comece a receber cotações organizadas hoje mesmo.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="https://wa.me/5511978350552?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20o%20sistema%20de%20Captação%20de%20Leads%20do%20BrokerOn!"
                target="_blank"
                className="flex w-full sm:w-auto items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-emerald-500 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Falar com Especialista
              </Link>
              <a
                href="mailto:contato@omniheus.com.br?subject=Interesse%20no%20sistema%20de%20captacao"
                className="flex w-full sm:w-auto items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 px-8 py-3 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
              >
                <Mail className="mr-2 h-4 w-4" />
                Solicitar Demonstração
              </a>
            </div>
          </section>

        </div>

      </div>
    </div>
  );
}
