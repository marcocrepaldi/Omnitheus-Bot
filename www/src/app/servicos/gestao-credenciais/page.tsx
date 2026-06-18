import type { Metadata } from "next";
import Link from "next/link";
import { Bot, CheckCircle, AlertCircle, RefreshCw, ArrowLeft, Mail, MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Gestão de Credenciais Quiver | BrokerOn",
  description: "Monitore logins e atualize senhas do Quiver de forma 100% automática. Evite cotações travadas e normalize checkboxes amarelos na Central de Senhas com o BrokerOn.",
  alternates: {
    canonical: "/servicos/gestao-credenciais",
  },
};

export default function GestaoCredenciaisPage() {
  const features = [
    "Verificação diária automática às 08:00 das credenciais do Quiver",
    "Detecção instantânea de senhas expiradas ou seguradoras fora do ar",
    "Alertas automáticos por e-mail com suporte a múltiplos destinatários",
    "Sincronização imediata a partir do Cofre Pro (sem trocar no portal da cia)",
    "Normalização automática de checkboxes indeterminados (status 'X' para 'S')",
    "Logs detalhados de execução para auditoria completa e segurança"
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
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400 border border-zinc-800">
            <Bot className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display sm:text-5xl">
            Gestão Automática de Credenciais Quiver
          </h1>
          <p className="text-lg leading-relaxed text-zinc-400 mt-2">
            Elimine a dor de cabeça de logins bloqueados nas seguradoras. Nossos robôs monitoram a Central de Senhas do Quiver, identificam expirações e atualizam os dados instantaneamente.
          </p>
        </div>

        {/* Dynamic content sections */}
        <div className="mt-12 space-y-12 border-t border-zinc-900 pt-12">
          
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-bold text-white font-display">Como funciona a Verificação (Robô 1)</h2>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                Diariamente às 08:00, o Robô 1 inicia uma sessão automatizada no Quiver. Ele resolve os Captchas através da nossa integração inteligente e varre a Central de Senhas. 
              </p>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                Qualquer inconsistência ou login falho gera um alerta imediato por e-mail para a equipe técnica da sua corretora, antes que um corretor tente cotar e descubra o problema na frente do cliente.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-display mb-4">Fluxo de Operação</h3>
              <div className="space-y-4 text-xs">
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/10 text-violet-400 font-bold">1</span>
                  <span className="text-zinc-300">Robô faz login no Quiver e acessa módulo via JS direto.</span>
                </div>
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/10 text-violet-400 font-bold">2</span>
                  <span className="text-zinc-300">Coleta seguradoras com erro (.cia-com-erro no frame).</span>
                </div>
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/10 text-violet-400 font-bold">3</span>
                  <span className="text-zinc-300">Envia relatório consolidado SMTP aos destinatários.</span>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-zinc-900 pt-12">
            <div className="order-2 md:order-1 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-display mb-4">Por que a sincronização falha sem o robô?</h3>
              <div className="space-y-3 text-xs">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-zinc-300">Checkboxes no Quiver entram no estado indeterminado ("X") quando expiram.</span>
                </div>
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-zinc-300">Ao tentar salvar manualmente, o Quiver rejeita ou não valida as novas credenciais.</span>
                </div>
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-zinc-300">O Robô 3 força de "X" para "S" (Sim) ou "N" (Não), resolvendo o bug por completo.</span>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <h2 className="text-xl font-bold text-white font-display">A Sincronização Inteligente (Robô 3)</h2>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                Quando você altera uma senha no portal de uma seguradora, basta registrá-la no nosso Cofre de Senhas Pro e clicar em <strong>"Sincronizar Quiver"</strong>.
              </p>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                O Robô 3 assume imediatamente. Ele acessa a Central de Senhas via API, busca a credencial específica da seguradora (ex: Suhai, Bradesco, Allianz), limpa chaves internas do Angular, corrige o status dos checkboxes indeterminados e executa um PUT direto. Pronto: sincronização em segundos!
              </p>
            </div>
          </section>

          <section className="border-t border-zinc-900 pt-12">
            <h2 className="text-xl font-bold text-white font-display mb-6">Benefícios Exclusivos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, i) => (
                <div key={i} className="flex gap-3 p-4 rounded-xl border border-zinc-900 bg-zinc-900/10">
                  <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span className="text-sm text-zinc-300">{feature}</span>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Conversion Section */}
          <section className="border-t border-zinc-900 pt-16 text-center">
            <h3 className="text-2xl font-bold text-white font-display">Chega de atrasos na transmissão de propostas</h3>
            <p className="text-zinc-400 mt-2 max-w-lg mx-auto text-sm">
              Automatize a Central de Senhas da sua corretora e garanta produtividade total aos seus colaboradores hoje mesmo.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="https://wa.me/5511978350552?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20a%20gestão%20de%20credenciais%20do%20BrokerOn!"
                target="_blank"
                className="flex w-full sm:w-auto items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-emerald-500 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Falar com Especialista
              </Link>
              <a
                href="mailto:contato@omniheus.com.br?subject=Interesse%20no%20robo%20de%20credenciais"
                className="flex w-full sm:w-auto items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 px-8 py-3 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
              >
                <Mail className="mr-2 h-4 w-4" />
                Solicitar Orçamento
              </a>
            </div>
          </section>

        </div>

      </div>
    </div>
  );
}
