import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Key, Eye, Users, ArrowLeft, Mail, MessageSquare, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Cofre de Senhas Pro | BrokerOn",
  description: "Armazene credenciais de seguradoras com segurança absoluta. Criptografia AES-256 via Fernet, histórico de senhas e controle granular de acesso (RBAC v2) com o BrokerOn.",
  alternates: {
    canonical: "/servicos/cofre-pro",
  },
};

export default function CofreProPage() {
  const specs = [
    {
      title: "Criptografia Fernet (AES-256)",
      desc: "Todas as senhas e campos ocultos são criptografados antes de serem gravados no banco de dados. A chave mestre fica isolada e protegida.",
      icon: Key
    },
    {
      title: "Campos Dinâmicos e Flexíveis",
      desc: "Configure campos personalizados por seguradora (usuários adicionais, chaves de API, tokens) informando o tipo e a privacidade de cada campo.",
      icon: Shield
    },
    {
      title: "Controle de Acessos Granular (RBAC v2)",
      desc: "Defina perfis customizados (como 'Financeiro' ou 'Cofre Básico'). Crie times e vincule permissões exatas sobre o que cada usuário vê.",
      icon: Users
    },
    {
      title: "Histórico de Alterações Auditado",
      desc: "Mantemos o histórico das últimas 5 senhas utilizadas. Toda revelação de senha na UI gera um log de auditoria detalhado e rastreável.",
      icon: Eye
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
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-zinc-800">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display sm:text-5xl">
            Cofre de Senhas Pro para Corretoras
          </h1>
          <p className="text-lg leading-relaxed text-zinc-400 mt-2">
            Centralize todos os acessos das seguradoras da sua corretora em um ambiente blindado e homologado para conformidade com a LGPD.
          </p>
        </div>

        {/* Technical breakdown */}
        <div className="mt-12 space-y-12 border-t border-zinc-900 pt-12">
          
          <section>
            <h2 className="text-xl font-bold text-white font-display mb-6">Especificações Técnicas de Segurança</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {specs.map((spec, i) => (
                <div key={i} className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/20">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-emerald-400 mb-4">
                    <spec.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-white font-display">{spec.title}</h3>
                  <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{spec.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-zinc-900 pt-12">
            <div>
              <h2 className="text-xl font-bold text-white font-display">A Arquitetura de Permissões (RBAC)</h2>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                Chega de compartilhar senhas por WhatsApp ou planilha compartilhada. Com o BrokerOn, você controla rigidamente quem tem acesso a qual informação.
              </p>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                As permissões seguem o padrão estruturado <code>modulo:acao@escopo</code> (ex: <code>cofre:reveal@cat:Auto</code>). Assim, o usuário do setor Financeiro só pode revelar senhas das categorias de bancos, enquanto o emissor de Auto só visualiza as seguradoras de veículos.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 flex flex-col justify-center">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-display mb-4">Auditoria Integrada</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Toda ação sensível é registrada de forma imutável em nossa tabela de auditoria:
              </p>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-zinc-300"><code>cofre:reveal</code> — Revelação de senha pelo usuário</span>
                </div>
                <div className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-zinc-300"><code>cofre:edit</code> — Edição de campos ou credenciais</span>
                </div>
                <div className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-zinc-300"><code>cofre:delete</code> — Exclusão de itens do cofre</span>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Conversion Section */}
          <section className="border-t border-zinc-900 pt-16 text-center">
            <h3 className="text-2xl font-bold text-white font-display">Segurança da Informação e Conformidade Legal</h3>
            <p className="text-zinc-400 mt-2 max-w-lg mx-auto text-sm">
              Proteja as credenciais da sua corretora e evite vazamentos de dados que colocam sua carteira de clientes em risco.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="https://wa.me/5511985266582?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20o%20cofre%20de%20senhas%20do%20BrokerOn!"
                target="_blank"
                className="flex w-full sm:w-auto items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-emerald-500 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Falar com Especialista
              </Link>
              <a
                href="mailto:contato@omniheus.com.br?subject=Interesse%20no%20Cofre%20Pro"
                className="flex w-full sm:w-auto items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 px-8 py-3 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
              >
                <Mail className="mr-2 h-4 w-4" />
                Agendar Demonstração
              </a>
            </div>
          </section>

        </div>

      </div>
    </div>
  );
}
