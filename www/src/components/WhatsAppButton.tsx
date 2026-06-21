import Link from "next/link";
import { MessageCircle } from "lucide-react";

const whatsappUrl =
  "https://wa.me/5511985266582?text=Olá,%20vim%20pelo%20site%20do%20BrokerOn%20e%20quero%20conhecer%20a%20plataforma.";

export default function WhatsAppButton() {
  return (
    <Link
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com o BrokerOn pelo WhatsApp"
      className="group fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-full border border-white/20 bg-[#25D366] p-3.5 text-white shadow-[0_16px_45px_rgba(0,0,0,0.35)] transition hover:-translate-y-1 hover:bg-[#20bd5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:bottom-7 sm:right-7 sm:px-5 sm:py-3.5"
    >
      <MessageCircle className="h-6 w-6 fill-white/10" />
      <span className="hidden text-sm font-bold sm:inline">Fale pelo WhatsApp</span>
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/20 motion-reduce:hidden" aria-hidden="true" />
    </Link>
  );
}
