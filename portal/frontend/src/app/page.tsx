"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Bot, CheckCircle, XCircle, Activity, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const API = process.env.NEXT_PUBLIC_API_URL;

interface Stats {
  total_robos: number;
  robos_ativos: number;
  total_execucoes: number;
  execucoes_com_falha: number;
  ultima_execucao: string | null;
  credenciais_com_erro: string[];
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl p-5 border border-neutral-200 dark:border-neutral-800 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={22} className="text-neutral-900 dark:text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import("@/lib/auth").then(({ authHeader }) => {
      fetch(`${API}/execucoes/dashboard`, { headers: authHeader() })
        .then((r) => r.json())
        .then(setStats)
        .finally(() => setLoading(false));
    });
  }, []);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Dashboard</h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-8 text-sm">
          {stats?.ultima_execucao
            ? `Última execução: ${format(new Date(stats.ultima_execucao), "dd/MM/yyyy HH:mm", { locale: ptBR })}`
            : "Nenhuma execução registrada"}
        </p>

        {loading ? (
          <p className="text-neutral-500">Carregando...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total de Robôs" value={stats?.total_robos ?? 0} icon={Bot} color="bg-red-600" />
              <StatCard label="Robôs Ativos" value={stats?.robos_ativos ?? 0} icon={CheckCircle} color="bg-red-500" />
              <StatCard label="Execuções" value={stats?.total_execucoes ?? 0} icon={Activity} color="bg-red-700" />
              <StatCard label="Com Falha" value={stats?.execucoes_com_falha ?? 0} icon={XCircle} color="bg-red-900" />
            </div>

            {stats && (stats.credenciais_com_erro ?? []).length > 0 && (
              <div className="bg-red-950 border border-red-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="text-red-400" size={20} />
                  <h3 className="text-red-300 font-semibold">Credenciais com falha na última execução</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(stats.credenciais_com_erro ?? []).map((c) => (
                    <span key={c} className="bg-red-900 text-red-200 text-xs font-medium px-3 py-1 rounded-full border border-red-700">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {stats && (stats.credenciais_com_erro ?? []).length === 0 && stats.total_execucoes > 0 && (
              <div className="bg-emerald-950 border border-emerald-800 rounded-xl p-6 flex items-center gap-3">
                <CheckCircle className="text-emerald-400" size={20} />
                <p className="text-emerald-300 font-medium">Todas as credenciais estão OK na última execução.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
