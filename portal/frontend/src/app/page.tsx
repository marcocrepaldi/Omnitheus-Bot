"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Bot, CheckCircle, XCircle, Activity, AlertTriangle,
  Clock, TrendingUp, CalendarCheck, RefreshCw,
} from "lucide-react";
import { format, formatDistanceToNow, differenceInSeconds } from "date-fns";
import { ptBR } from "date-fns/locale";

const API = process.env.NEXT_PUBLIC_API_URL;

interface ExecucaoMini {
  id: number;
  robo_nome: string | null;
  status: string;
  iniciado_em: string;
  finalizado_em: string | null;
  total_erros: number;
}

interface Stats {
  total_robos: number;
  robos_ativos: number;
  total_execucoes: number;
  execucoes_com_falha: number;
  ultima_execucao: string | null;
  ultima_execucao_status: string | null;
  ultima_execucao_robo: string | null;
  ultima_execucao_duracao: number | null;
  credenciais_com_erro: string[];
  ultimas_execucoes: ExecucaoMini[];
}

function StatCard({
  label, value, icon: Icon, color, sub,
}: {
  label: string; value: number | string; icon: any; color: string; sub?: string;
}) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl p-5 border border-neutral-200 dark:border-neutral-800 flex items-start gap-4">
      <div className={`p-3 rounded-lg shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-neutral-900 dark:text-white leading-none">{value}</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{label}</p>
        {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
  sucesso:      { label: "Sucesso",      dot: "bg-emerald-400", text: "text-emerald-400" },
  falha:        { label: "Falha",        dot: "bg-red-400",     text: "text-red-400"     },
  erro:         { label: "Erro",         dot: "bg-red-400",     text: "text-red-400"     },
  em_execucao:  { label: "Em execução",  dot: "bg-yellow-400",  text: "text-yellow-400"  },
};

function StatusDot({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { dot: "bg-neutral-400", text: "text-neutral-400", label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function duracao(segundos: number | null) {
  if (segundos === null || segundos === undefined) return "—";
  if (segundos < 60) return `${segundos}s`;
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function execDuracao(e: ExecucaoMini): string {
  if (!e.finalizado_em || !e.iniciado_em) return "—";
  const sec = differenceInSeconds(new Date(e.finalizado_em), new Date(e.iniciado_em));
  return duracao(sec);
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [agora, setAgora] = useState(new Date());

  const carregar = () => {
    import("@/lib/auth").then(({ authHeader }) => {
      fetch(`${API}/execucoes/dashboard`, { headers: authHeader() })
        .then((r) => r.json())
        .then(setStats)
        .finally(() => setLoading(false));
    });
  };

  useEffect(() => {
    carregar();
    // Atualiza o relógio relativo a cada minuto
    const tick = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(tick);
  }, []);

  const ultimaExec = stats?.ultima_execucao ? new Date(stats.ultima_execucao) : null;
  const taxaSucesso =
    stats && stats.total_execucoes > 0
      ? Math.round(((stats.total_execucoes - stats.execucoes_com_falha) / stats.total_execucoes) * 100)
      : null;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 min-h-screen bg-neutral-50 dark:bg-neutral-950">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Dashboard</h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
              {format(agora, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); carregar(); }}
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-3 py-2 rounded-lg transition-colors"
          >
            <RefreshCw size={13} />
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-neutral-500 text-sm">
            <RefreshCw size={16} className="animate-spin" />
            Carregando dados...
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                label="Total de Robôs"
                value={stats?.total_robos ?? 0}
                icon={Bot}
                color="bg-red-600"
                sub={`${stats?.robos_ativos ?? 0} ativos`}
              />
              <StatCard
                label="Execuções"
                value={stats?.total_execucoes ?? 0}
                icon={Activity}
                color="bg-violet-600"
                sub="total registrado"
              />
              <StatCard
                label="Com Falha"
                value={stats?.execucoes_com_falha ?? 0}
                icon={XCircle}
                color={stats?.execucoes_com_falha ? "bg-red-700" : "bg-neutral-600"}
                sub={taxaSucesso !== null ? `${taxaSucesso}% de sucesso` : undefined}
              />
              <StatCard
                label="Taxa de Sucesso"
                value={taxaSucesso !== null ? `${taxaSucesso}%` : "—"}
                icon={TrendingUp}
                color={taxaSucesso !== null && taxaSucesso >= 80 ? "bg-emerald-600" : "bg-yellow-600"}
                sub="nas execuções"
              />
            </div>

            {/* Último Relatório */}
            {ultimaExec ? (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarCheck size={17} className="text-neutral-400" />
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 uppercase tracking-wide">
                    Último Relatório
                  </h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {/* Data/hora */}
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Data e hora</p>
                    <p className="text-neutral-900 dark:text-white font-semibold text-sm">
                      {format(ultimaExec, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                      {format(ultimaExec, "HH:mm:ss", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {formatDistanceToNow(ultimaExec, { locale: ptBR, addSuffix: true })}
                    </p>
                  </div>

                  {/* Robô */}
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Robô</p>
                    <p className="text-neutral-900 dark:text-white font-semibold text-sm">
                      {stats?.ultima_execucao_robo ?? "—"}
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Resultado</p>
                    <div className="mt-0.5">
                      <StatusDot status={stats?.ultima_execucao_status ?? ""} />
                    </div>
                    {(stats?.credenciais_com_erro ?? []).length > 0 && (
                      <p className="text-xs text-red-400 mt-1">
                        {stats!.credenciais_com_erro.length} cred. com erro
                      </p>
                    )}
                    {(stats?.credenciais_com_erro ?? []).length === 0 &&
                      stats?.ultima_execucao_status === "sucesso" && (
                        <p className="text-xs text-emerald-400 mt-1">Tudo OK</p>
                      )}
                  </div>

                  {/* Duração */}
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Duração</p>
                    <p className="text-neutral-900 dark:text-white font-semibold text-sm flex items-center gap-1">
                      <Clock size={13} className="text-neutral-400" />
                      {duracao(stats?.ultima_execucao_duracao ?? null)}
                    </p>
                  </div>
                </div>

                {/* Credenciais com erro */}
                {(stats?.credenciais_com_erro ?? []).length > 0 && (
                  <div className="mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={15} className="text-red-400" />
                      <p className="text-sm font-medium text-red-400">Credenciais com falha</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {stats!.credenciais_com_erro.map((c) => (
                        <span
                          key={c}
                          className="bg-red-950 text-red-300 text-xs font-medium px-3 py-1 rounded-full border border-red-800"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tudo OK banner inline */}
                {(stats?.credenciais_com_erro ?? []).length === 0 &&
                  stats?.ultima_execucao_status === "sucesso" && (
                    <div className="mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2 text-emerald-400">
                      <CheckCircle size={16} />
                      <p className="text-sm font-medium">
                        Todas as credenciais estão OK nesta execução
                      </p>
                    </div>
                  )}
              </div>
            ) : (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 mb-6 text-center">
                <Bot size={32} className="text-neutral-400 mx-auto mb-3" />
                <p className="text-neutral-500 text-sm">Nenhuma execução registrada ainda.</p>
                <p className="text-neutral-400 text-xs mt-1">
                  Acesse <strong className="text-neutral-300">Robôs</strong> para disparar o primeiro relatório.
                </p>
              </div>
            )}

            {/* Histórico recente */}
            {(stats?.ultimas_execucoes ?? []).length > 0 && (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 uppercase tracking-wide mb-4">
                  Histórico Recente
                </h3>
                <div className="space-y-1">
                  {stats!.ultimas_execucoes.map((e, idx) => (
                    <div
                      key={e.id}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${
                        idx === 0
                          ? "bg-neutral-100 dark:bg-neutral-800"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-neutral-400 w-16 shrink-0">
                          EX-{String(e.id).padStart(4, "0")}
                        </span>
                        <span className="text-sm text-neutral-700 dark:text-neutral-200 truncate">
                          {e.robo_nome ?? `Robô #${e.id}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 shrink-0">
                        <span className="text-xs text-neutral-400 hidden md:block">
                          {format(new Date(e.iniciado_em), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                        <span className="text-xs text-neutral-400 w-16 text-right hidden sm:block">
                          {execDuracao(e)}
                        </span>
                        {e.total_erros > 0 && (
                          <span className="text-xs text-red-400 w-14 text-right">
                            {e.total_erros} erro{e.total_erros !== 1 ? "s" : ""}
                          </span>
                        )}
                        <div className="w-24 text-right">
                          <StatusDot status={e.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
