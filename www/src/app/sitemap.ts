import { MetadataRoute } from "next";
import { recursos } from "@/content/recursos";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://brokeron.com.br";
  
  const routes = [
    "",
    "/recursos",
    "/politica-privacidade",
    "/termos-de-uso",
  ];

  const paginasRecursos = recursos.map((recurso) => `/recursos/${recurso.slug}`);

  return [...routes, ...paginasRecursos].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1.0 : route === "/recursos" ? 0.9 : route.startsWith("/recursos/") ? 0.8 : 0.3,
  }));
}
