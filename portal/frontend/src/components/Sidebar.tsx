"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Bot, CalendarClock, ScrollText, Users, LogOut, Building2 } from "lucide-react";
import { getUser, logout, limparSessao } from "@/lib/auth";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, role: "viewer", superAdmin: false },
  { href: "/robos", label: "Robôs", icon: Bot, role: "viewer", superAdmin: false },
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
    <aside className="w-60 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <p className="text-xs text-gray-500 uppercase tracking-widest">Harper Seguros</p>
        <h1 className="text-lg font-bold text-white mt-1">Portal Robôs</h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.filter(l => visivel(l.role) && (!l.superAdmin || user?.tenant_id === 1)).map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}>
              <Icon size={18} />{label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        {user && (
          <div className="mb-3 px-2">
            <p className="text-white text-sm font-medium truncate">{user.nome}</p>
            <span className="text-xs text-gray-500 capitalize">{user.role}</span>
          </div>
        )}
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-gray-400 hover:text-red-400 text-sm transition-colors px-2 py-1.5 w-full rounded-lg hover:bg-gray-800">
          <LogOut size={16} /> Sair
        </button>
      </div>
    </aside>
  );
}
