"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Bot, CalendarClock, ScrollText, Users, LogOut, Building2,
  KeyRound, ShieldCheck, Lock, Tag, Shield, Activity, ChevronDown, BarChart2,
} from "lucide-react";
import { getUser, logout, limparSessao } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NavLink {
  href: string; label: string; icon: any;
  perm?: string;        // permissão necessária (RBAC v2)
  roleMin?: string;     // fallback role legado
  superAdmin?: boolean;
  grupo?: string;       // agrupamento visual
}

const links: NavLink[] = [
  { href: "/",            label: "Dashboard",     icon: LayoutDashboard, perm: "dashboard:view" },
  { href: "/robos",       label: "Robôs",         icon: Bot,             perm: "robos:view" },
  { href: "/credenciais", label: "Credenciais",   icon: KeyRound,        perm: "credenciais:view" },
  { href: "/cofre",       label: "Cofre",         icon: Lock,            perm: "cofre:view@*" },
  { href: "/agendamentos",label: "Agendamentos",  icon: CalendarClock,   perm: "agendamentos:view" },
  { href: "/logs",        label: "Logs",          icon: ScrollText,      perm: "logs:view" },
  { href: "/relatorio-vendas", label: "Rel. Vendas",  icon: BarChart2,       roleMin: "viewer" },

  { href: "/categorias",  label: "Categorias",    icon: Tag,             perm: "categorias:manage", grupo: "admin" },
  { href: "/roles",       label: "Perfis",        icon: Shield,          perm: "roles:manage",      grupo: "admin" },
  { href: "/times",       label: "Times",         icon: Users,           perm: "teams:manage",      grupo: "admin" },
  { href: "/usuarios",    label: "Usuários",      icon: Users,           perm: "usuarios:manage",   grupo: "admin" },
  { href: "/auditoria",   label: "Auditoria",     icon: Activity,        perm: "audit:view",        grupo: "admin" },

  { href: "/clientes",    label: "Clientes",      icon: Building2,       roleMin: "admin", superAdmin: true },
];

const HIERARQUIA: Record<string, number> = { owner: 4, admin: 3, operator: 2, viewer: 1, cofre: 0 };

export default function Sidebar() {
  const path   = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ nome: string; role: string; tenant_id: number } | null>(null);
  const [adminAberto, setAdminAberto] = useState(true);

  useEffect(() => { setUser(getUser()); }, []);

  const handleLogout = async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (refresh) await logout(refresh);
    else limparSessao();
    router.push("/login");
  };

  const isCofre = user?.role === "cofre";

  // Calcula links visíveis
  const visibilidade = (l: NavLink): boolean => {
    if (l.superAdmin && user?.tenant_id !== 1) return false;
    if (l.perm) return temPermissao(l.perm);
    if (l.roleMin) return HIERARQUIA[user?.role ?? "viewer"] >= HIERARQUIA[l.roleMin];
    return true;
  };

  const linksVisiveis = isCofre
    ? links.filter(l => l.href === "/cofre")
    : links.filter(visibilidade);

  const linksPrincipais = linksVisiveis.filter(l => !l.grupo);
  const linksAdmin      = linksVisiveis.filter(l => l.grupo === "admin");

  const renderLink = ({ href, label, icon: Icon }: NavLink) => {
    const active = path === href;
    return (
      <Link key={href} href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          active
            ? "bg-red-600 text-white"
            : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-white"
        }`}>
        <Icon size={18} />{label}
      </Link>
    );
  };

  return (
    <aside className="w-60 min-h-screen bg-white dark:bg-black border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-start">
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-widest">Harper Seguros</p>
          <h1 className="text-lg font-bold text-neutral-900 dark:text-white mt-1">Portal Robôs</h1>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {linksPrincipais.map(renderLink)}

        {linksAdmin.length > 0 && (
          <div className="pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800/60">
            <button onClick={() => setAdminAberto(v => !v)}
              className="w-full flex items-center justify-between text-xs uppercase tracking-widest text-neutral-500 px-3 py-2 hover:text-neutral-300 transition-colors">
              <span>Administração</span>
              <ChevronDown size={12} className={`transition-transform ${adminAberto ? "rotate-180" : ""}`} />
            </button>
            {adminAberto && linksAdmin.map(renderLink)}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
        {user && (
          <div className="mb-3 px-2">
            <p className="text-neutral-900 dark:text-white text-sm font-medium truncate">{user.nome}</p>
            <span className={`text-xs capitalize px-2 py-0.5 rounded-full font-medium ${
              isCofre ? "bg-blue-900/40 text-blue-300" : "text-neutral-500"
            }`}>
              {isCofre ? "Acesso ao Cofre" : user.role}
            </span>
          </div>
        )}
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 hover:text-red-500 text-sm transition-colors px-2 py-1.5 w-full rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900">
          <LogOut size={16} /> Sair
        </button>
      </div>
    </aside>
  );
}
