import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Condições gerais de acesso e uso do BrokerOn.",
};

export default function TermosDeUso() {
  return (
    <main className="bg-[#050609] px-6 py-20 text-zinc-300">
      <article className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">BrokerOn · Grupo Omnitheus</p>
        <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">Termos de Uso</h1>
        <p className="mt-4 text-sm text-zinc-500">Última atualização: 20 de junho de 2026</p>
        <div className="mt-12 space-y-5 text-sm leading-7 [&_h2]:pt-5 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white">
          <p>Estes termos estabelecem as condições gerais para acesso e utilização do BrokerOn, plataforma operacional para corretoras de seguros oferecida pelo Grupo Omnitheus.</p>
          <h2>1. Uso da plataforma</h2>
          <p>O acesso é destinado a clientes e usuários autorizados. Cada usuário deve manter suas credenciais de acesso protegidas e utilizar o serviço de acordo com a legislação e com as permissões concedidas pela organização contratante.</p>
          <h2>2. Responsabilidades do cliente</h2>
          <p>O cliente é responsável pela legitimidade dos dados inseridos, pela configuração de seus usuários e pelo uso das integrações contratadas. É proibido utilizar a plataforma para atividades ilícitas ou que prejudiquem sua segurança e disponibilidade.</p>
          <h2>3. Disponibilidade e evolução</h2>
          <p>A plataforma pode receber atualizações, melhorias e manutenções. Funcionalidades, limites, suporte e níveis de serviço aplicáveis a cada cliente são definidos na respectiva proposta ou contrato comercial.</p>
          <h2>4. Propriedade intelectual</h2>
          <p>O software, a identidade visual, os materiais e os componentes do BrokerOn pertencem ao Grupo Omnitheus ou aos respectivos licenciadores. A contratação não transfere direitos sobre a tecnologia.</p>
          <h2>5. Dados e confidencialidade</h2>
          <p>O tratamento de informações observa a Política de Privacidade e os instrumentos firmados com cada cliente. As partes devem preservar informações confidenciais conhecidas durante a prestação do serviço.</p>
          <h2>6. Contato</h2>
          <p>Dúvidas sobre estes termos podem ser enviadas para contato@omniheus.com.br.</p>
        </div>
      </article>
    </main>
  );
}
