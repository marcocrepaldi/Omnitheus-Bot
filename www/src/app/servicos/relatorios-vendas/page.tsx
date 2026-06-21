import type { Metadata } from "next";
import Link from "next/link";
import { FileSpreadsheet, Download, BarChart2, Calendar, ArrowLeft, Mail, MessageSquare, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Relatórios de Vendas Automáticos | BrokerOn",
  description: "Monitore a produção da sua corretora sem trabalho manual. O BrokerOn extrai planilhas do Quiver, analisa vendas e gera relatórios consolidados automáticos.",
  alternates: {
    canonical: "/servicos/relatorios-vendas",
  },
};

export default function RelatoriosVendasPage() {
  const steps = [
    {
      title: "1. Agendamento Customizado",
      desc: "Você define a frequência de extração (diária, semanal ou mensal) e as filiais/categorias de seguros de interesse.",
      icon: Calendar
    },
    {
      title: "2. Download Direto no Quiver",
      desc: "O robô faz o login seguro, navega até o módulo de produção, preenche os filtros necessários e realiza o download do XLSX original.",
      icon: Download
    },
    {
      title: "3. Limpeza & Análise de Dados",
      desc: "O motor em Python limpa células vazias, consolida cabeçalhos e formata as colunas em tabelas limpas prontas para análise.",
      icon: FileSpreadsheet
    },
    {
      title: "4. Dashboard Estruturado",
      desc: "Os dados são carregados no painel ou enviados por e-mail em formato executivo, facilitando a tomada de decisões rápidas.",
      icon: BarChart2
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
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-zinc-800">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display sm:text-5xl">
            Relatórios de Vendas & Produção Automáticos
          </h1>
          <p className="text-lg leading-relaxed text-zinc-400 mt-2">
            Acompanhe o faturamento e o volume de vendas da sua corretora sem precisar extrair planilhas de forma repetitiva. O Robô 5 faz tudo por você.
          </p>
        </div>

        {/* Process layout */}
        <div className="mt-12 space-y-12 border-t border-zinc-900 pt-12">
          
          <section>
            <h2 className="text-xl font-bold text-white font-display mb-6">Como funciona a extração</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-4 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/10">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-blue-400">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-zinc-900 pt-12">
            <div>
              <h2 className="text-xl font-bold text-white font-display">Decisões guiadas por dados reais</h2>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                Corretoras de alta performance utilizam dados para direcionar seus investimentos de marketing e campanhas de vendas. No entanto, coletar essa informação manualmente é entediante.
              </p>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                Nossos robôs eliminam esse gargalo operacional, oferecendo dados consolidados sempre que você precisar, prontos para serem integrados a ferramentas como PowerBI ou Excel.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 flex flex-col justify-center">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-display mb-4">Vantagens Operacionais</h3>
              <div className="space-y-3 text-xs">
                <div className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-zinc-300">Economia de até 4 horas por semana de assistentes.</span>
                </div>
                <div className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-zinc-300">Eliminação completa de erros humanos de preenchimento.</span>
                </div>
                <div className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-zinc-300">Histórico unificado de produção acessível de qualquer lugar.</span>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Conversion Section */}
          <section className="border-t border-zinc-900 pt-16 text-center">
            <h3 className="text-2xl font-bold text-white font-display">Tome decisões com base em números e fatos</h3>
            <p className="text-zinc-400 mt-2 max-w-lg mx-auto text-sm">
              Automatize as planilhas da sua corretora e tenha mais tempo para focar no fechamento de novas apólices.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="https://wa.me/5511985266582?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20o%20robô%20de%20Relatórios%20de%20Vendas!"
                target="_blank"
                className="flex w-full sm:w-auto items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-emerald-500 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Falar com Especialista
              </Link>
              <a
                href="mailto:contato@omniheus.com.br?subject=Interesse%20no%20robo%20de%20relatorios"
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
