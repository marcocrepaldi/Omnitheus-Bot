import type { Metadata } from "next";
import Link from "next/link";
import { Percent, TrendingUp, AlertTriangle, Scale, ArrowLeft, Mail, MessageSquare, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Conciliação e Comissões Quiver | BrokerOn",
  description: "Monitore comissões pendentes, recebidas e ocorrências de baixa de forma automatizada no Quiver com o BrokerOn. Proteja a saúde financeira da sua corretora.",
  alternates: {
    canonical: "/servicos/conciliacao-comissoes",
  },
};

export default function ConciliacaoComissoesPage() {
  const robots = [
    {
      title: "Robô 7: Comissões Pendentes",
      desc: "Analisa e extrai todas as comissões registradas que ainda não foram repassadas pelas seguradoras, alertando sobre atrasos nos pagamentos.",
      icon: AlertTriangle
    },
    {
      title: "Robô 8: Comissões Recebidas",
      desc: "Baixa os extratos diretamente dos portais das seguradoras e confronta com os valores cadastrados no Quiver para auditoria automática.",
      icon: TrendingUp
    },
    {
      title: "Robô 9: Ocorrências de Baixa",
      desc: "Identifica divergências centavo a centavo entre a comissão prometida e a efetivamente paga, listando todas as ocorrências de erro.",
      icon: Scale
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
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-zinc-800">
            <Percent className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display sm:text-5xl">
            Conciliação Financeira de Comissões
          </h1>
          <p className="text-lg leading-relaxed text-zinc-400 mt-2">
            Garanta a integridade financeira da sua corretora de seguros. Nossos robôs auditam cada repasse, comissão pendente e divergências no Quiver.
          </p>
        </div>

        {/* Dynamic content sections */}
        <div className="mt-12 space-y-12 border-t border-zinc-900 pt-12">
          
          <section>
            <h2 className="text-xl font-bold text-white font-display mb-6">Tríade de Automação Financeira</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {robots.map((robot, i) => (
                <div key={i} className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/20 flex flex-col justify-between">
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-amber-400 mb-4">
                      <robot.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-white font-display">{robot.title}</h3>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{robot.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-zinc-900 pt-12">
            <div>
              <h2 className="text-xl font-bold text-white font-display">O fim das perdas silenciosas de comissão</h2>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                Muitas corretoras perdem dinheiro todos os meses porque a seguradora repassa um percentual menor de comissão do que o acordado na apólice e o erro passa despercebido no volume de propostas.
              </p>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                Nossos robôs realizam a conferência de forma implacável. Eles cruzam as tabelas e apontam os desvios centavo por centavo, permitindo que a corretora acione a seguradora e recupere os valores devidos.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 flex flex-col justify-center">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-display mb-4">Principais Resultados</h3>
              <div className="space-y-3 text-xs">
                <div className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-zinc-300">Auditoria de 100% dos lançamentos financeiros.</span>
                </div>
                <div className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-zinc-300">Alertas em tempo real sobre repasses em atraso.</span>
                </div>
                <div className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-zinc-300">Recuperação ativa de valores de comissão glosados.</span>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Conversion Section */}
          <section className="border-t border-zinc-900 pt-16 text-center">
            <h3 className="text-2xl font-bold text-white font-display">Evite perdas no financeiro da sua corretora</h3>
            <p className="text-zinc-400 mt-2 max-w-lg mx-auto text-sm">
              Coloque o controle financeiro da sua corretora no piloto automático e pare de perder tempo conferindo extratos.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="https://wa.me/5511978350552?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20a%20conciliação%20de%20comissões%20do%20BrokerOn!"
                target="_blank"
                className="flex w-full sm:w-auto items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-emerald-500 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Falar com Especialista
              </Link>
              <a
                href="mailto:contato@omniheus.com.br?subject=Interesse%20no%20robo%20de%20comissoes"
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
