import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://brokeron.com.br";
  
  const routes = [
    "",
    "/servicos/gestao-credenciais",
    "/servicos/cofre-pro",
    "/servicos/relatorios-vendas",
    "/servicos/conciliacao-comissoes",
    "/servicos/gestao-sinistros-clientes",
    "/servicos/captacao-leads",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1.0 : 0.8,
  }));
}
