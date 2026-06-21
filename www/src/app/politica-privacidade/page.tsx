import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Saiba como o BrokerOn trata informações e dados pessoais.",
};

export default function PoliticaPrivacidade() {
  return (
    <LegalPage title="Política de Privacidade" updated="20 de junho de 2026">
      <p>Esta política explica como o BrokerOn, produto do Grupo Omnitheus, trata informações fornecidas por visitantes, clientes e usuários da plataforma.</p>
      <h2>1. Informações tratadas</h2>
      <p>Podemos tratar dados de contato, dados profissionais, registros de acesso, informações necessárias à prestação do serviço e dados inseridos pelos clientes em seus ambientes contratados.</p>
      <h2>2. Finalidades</h2>
      <p>As informações são utilizadas para prestar e aprimorar o serviço, administrar acessos, oferecer suporte, proteger a plataforma, cumprir obrigações legais e manter comunicações relacionadas à relação comercial.</p>
      <h2>3. Compartilhamento</h2>
      <p>Dados podem ser compartilhados com fornecedores essenciais à infraestrutura e operação do serviço, observando necessidade, confidencialidade e medidas de segurança adequadas. Não comercializamos dados pessoais.</p>
      <h2>4. Segurança e retenção</h2>
      <p>Adotamos controles técnicos e organizacionais para reduzir riscos de acesso indevido, perda ou alteração. Os dados são mantidos pelo período necessário à prestação do serviço e ao cumprimento de obrigações aplicáveis.</p>
      <h2>5. Direitos do titular</h2>
      <p>Solicitações relacionadas a confirmação de tratamento, acesso, correção, eliminação ou outras hipóteses previstas na legislação podem ser enviadas para contato@omniheus.com.br.</p>
      <h2>6. Contato</h2>
      <p>Em caso de dúvidas sobre esta política ou sobre o tratamento de dados, escreva para contato@omniheus.com.br.</p>
    </LegalPage>
  );
}

function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return <main className="bg-[#050609] px-6 py-20 text-zinc-300"><article className="mx-auto max-w-3xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">BrokerOn · Grupo Omnitheus</p><h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">{title}</h1><p className="mt-4 text-sm text-zinc-500">Última atualização: {updated}</p><div className="mt-12 space-y-5 text-sm leading-7 [&_h2]:pt-5 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white">{children}</div></article></main>;
}
