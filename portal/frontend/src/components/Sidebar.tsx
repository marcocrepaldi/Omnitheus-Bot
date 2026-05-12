"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Bot, CalendarClock, ScrollText, Users, LogOut, Building2, KeyRound, ShieldCheck } from "lucide-react";
import { getUser, logout, limparSessao } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, role: "viewer", superAdmin: false },
  { href: "/robos", label: "Robôs", icon: Bot, role: "viewer", superAdmin: false },
  { href: "/credenciais", label: "Credenciais", icon: KeyRound,    role: "operator", superAdmin: false },
  { href: "/cofre",       label: "Cofre",       icon: ShieldCheck, role: "operator", superAdmin: false },
  { href: "/agendamentos", label: "Agendamentos", icon: CalendarClock, role: "operator", superAdmin: false },
  { href: "/logs", label: "Logs", icon: ScrollText, role: "viewer", superAdmin: false },
  { href: "/usuarios", label: "Usuários", icon: Users, role: "admin", superAdmin: false },
  { href: "/clientes", label: "Clientes", icon: Building2, role: "admin", superAdmin: true },
];

const HIERARQUIA: Record<string, number> = { owner: 4, admin: 3, operator: 2, viewer: 1 };

export default function Sidebar() {
  const path   = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ nome: string; role: string; tenant_id: number } | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const handleLogout = async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (refresh) await logout(refresh);
    else limparSessao();
    router.push("/login");
  };

  const visivel = (roleMin: string) =>
    HIERARQUIA[user?.role ?? "viewer"] >= HIERARQUIA[roleMin];

  return (
    <aside className="w-60 min-h-screen bg-white dark:bg-black border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-start">
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-widest">Harper Seguros</p>
          <h1 className="text-lg font-bold text-neutral-900 dark:text-white mt-1">Portal Robôs</h1>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.filter(l => visivel(l.role) && (!l.superAdmin || user?.tenant_id === 1)).map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-red-600 text-white" : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-white"
              }`}>
              <Icon size={18} />{label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
        {user && (
          <div className="mb-3 px-2">
            <p className="text-neutral-900 dark:text-white text-sm font-medium truncate">{user.nome}</p>
            <span className="text-xs text-neutral-500 capitalize">{user.role}</span>
          </div>
        )}
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-500 text-sm transition-colors px-2 py-1.5 w-full rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900">
          <LogOut size={16} /> Sair
        </button>
      </div>
    </aside>
  );
}
