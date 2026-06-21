import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ShieldAlert, FolderOpen, HeartHandshake, ArrowLeft, Mail, MessageSquare, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Sinistros e Cadastro de Clientes Quiver | BrokerOn",
  description: "Automatize a gestão de sinistros e o cadastro de clientes no Quiver com o BrokerOn. Nossos robôs operam em segundo plano integrados às seguradoras.",
  alternates: {
    canonical: "/servicos/gestao-sinistros-clientes",
  },
};

export default function GestaoSinistrosClientesPage() {
  const features = [
    {
      title: "Robô 10: Atualização de Sinistros",
      desc: "Acompanha a regulação de sinistros em aberto direto nas seguradoras e atualiza o andamento e status no Quiver.",
      icon: ShieldAlert
    },
    {
      title: "Robô 11: Higienização de Cadastros",
      desc: "Importa, atualiza e sincroniza os dados cadastrais dos clientes em lote, mantendo a base de dados higienizada e livre de duplicidades.",
      icon: FolderOpen
    },
    {
      title: "Atendimento Humanizado e Focado",
      desc: "Ao remover o trabalho manual de cadastro e atualização, sua equipe ganha tempo para dar um suporte proativo aos segurados.",
      icon: HeartHandshake
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
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-400 border border-zinc-800">
            <Activity className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display sm:text-5xl">
            Automação de Sinistros & Base de Clientes
          </h1>
          <p className="text-lg leading-relaxed text-zinc-400 mt-2">
            Otimize as operações do dia a dia da sua corretora. Libere sua equipe do cadastro manual de novos clientes e acompanhamento de sinistros.
          </p>
        </div>

        {/* Dynamic content sections */}
        <div className="mt-12 space-y-12 border-t border-zinc-900 pt-12">
          
          <section>
            <h2 className="text-xl font-bold text-white font-display mb-6">Eficiência Operacional Extrema</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feat, i) => (
                <div key={i} className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/20 flex flex-col justify-between">
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-pink-400 mb-4">
                      <feat.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-white font-display">{feat.title}</h3>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-zinc-900 pt-12">
            <div>
              <h2 className="text-xl font-bold text-white font-display">A importância da velocidade no momento crítico</h2>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                Quando um segurado sofre um sinistro, ele precisa de respostas rápidas. O andamento da vistoria, da autorização do conserto e da indenização precisam ser atualizados constantemente no Quiver para que a corretora dê um feedback preciso.
              </p>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                Em vez de fazer sua equipe entrar portal por portal de seguradora todos os dias, o Robô 10 centraliza tudo automaticamente. A informação chega no seu Quiver sem atraso e sua equipe pode acalmar o cliente com dados exatos.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 flex flex-col justify-center">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-display mb-4">Principais Métricas</h3>
              <div className="space-y-3 text-xs">
                <div className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-zinc-300">Tempo de resposta ao cliente reduzido em até 60%.</span>
                </div>
                <div className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-zinc-300">Base de clientes 100% higienizada e atualizada.</span>
                </div>
                <div className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-zinc-300">Redução drástica de chamados de clientes ansiosos.</span>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Conversion Section */}
          <section className="border-t border-zinc-900 pt-16 text-center">
            <h3 className="text-2xl font-bold text-white font-display">O segurado merece o melhor atendimento no sinistro</h3>
            <p className="text-zinc-400 mt-2 max-w-lg mx-auto text-sm">
              Automatize as consultas operacionais da sua corretora e decole o nível de satisfação dos seus clientes.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="https://wa.me/5511985266582?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20a%20automação%20de%20sinistros%20do%20BrokerOn!"
                target="_blank"
                className="flex w-full sm:w-auto items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-emerald-500 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Falar com Especialista
              </Link>
              <a
                href="mailto:contato@omniheus.com.br?subject=Interesse%20no%20robo%20de%20sinistros"
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
