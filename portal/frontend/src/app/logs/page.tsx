"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { CheckCircle, XCircle, AlertCircle, Clock, RefreshCw, Activity } from "lucide-react";
import { format, formatDistanceStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

const API = process.env.NEXT_PUBLIC_API_URL;

interface Execucao {
  id: number; robo_id: number; robo_nome: string | null; status: string;
  credenciais_com_erro: string[]; total_erros: number;
  mensagem: string | null; iniciado_em: string; finalizado_em: string | null;
}

const STATUS_CFG: Record<string, { icon: JSX.Element; badge: string; label: string }> = {
  sucesso:     { icon: <CheckCircle size={16} className="text-emerald-400" />, badge: "bg-emerald-900/60 text-emerald-300 border border-emerald-800", label: "Sucesso" },
  falha:       { icon: <XCircle size={16} className="text-red-400" />,         badge: "bg-red-900/60 text-red-300 border border-red-800",           label: "Falha" },
  erro:        { icon: <XCircle size={16} className="text-red-400" />,         badge: "bg-red-900/60 text-red-300 border border-red-800",           label: "Erro" },
  em_execucao: { icon: <RefreshCw size={16} className="text-blue-400 animate-spin" />, badge: "bg-blue-900/60 text-blue-300 border border-blue-800", label: "Em execução" },
};

function duracao(inicio: string, fim: string | null) {
  if (!fim) return null;
  try { return formatDistanceStrict(new Date(fim), new Date(inicio), { locale: ptBR }); }
  catch { return null; }
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Execucao[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = () => {
    setLoading(true);
    import("@/lib/auth").then(({ authHeader }) => {
      fetch(`${API}/execucoes/?limit=100`, { headers: authHeader() })
        .then(r => r.ok ? r.json() : [])
        .then(data => setLogs(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false));
    });
  };
  useEffect(() => { carregar(); }, []);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Logs de Execução</h2>
            <p className="text-neutral-500 text-sm mt-1">Histórico completo de execuções dos robôs</p>
          </div>
          <button onClick={carregar}
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-3 py-2 rounded-lg transition-colors">
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-neutral-500 text-sm">
            <RefreshCw size={16} className="animate-spin" /> Carregando...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <Activity size={40} className="text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm font-medium">Nenhuma execução registrada</p>
            <p className="text-neutral-400 text-xs mt-1">Os logs aparecerão aqui quando os robôs forem executados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {logs.map(e => {
              const cfg = STATUS_CFG[e.status] ?? {
                icon: <AlertCircle size={16} className="text-yellow-400" />,
                badge: "bg-yellow-900/60 text-yellow-300 border border-yellow-800",
                label: e.status,
              };
              const dur = duracao(e.iniciado_em, e.finalizado_em);

              return (
                <div key={e.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex flex-col transition-all hover:border-neutral-400 dark:hover:border-neutral-600">
                  {/* Header do card */}
                  <div className="p-5 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 shrink-0">{cfg.icon}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-neutral-900 dark:text-white font-semibold text-sm truncate">
                            {e.robo_nome ?? `Robô #${e.robo_id}`}
                          </span>
                          <span className="text-neutral-400 font-mono text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded shrink-0">
                            EX-{String(e.id).padStart(4, "0")}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-500 flex-wrap">
                          <span>{format(new Date(e.iniciado_em), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</span>
                          {dur && (
                            <span className="flex items-center gap-1">
                              <Clock size={11} /> {dur}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Credenciais com erro */}
                  {e.credenciais_com_erro.length > 0 && (
                    <div className="px-5 pb-3 flex flex-wrap gap-2">
                      {e.credenciais_com_erro.map(c => (
                        <span key={c} className="bg-red-900/50 text-red-200 text-xs px-2.5 py-0.5 rounded-full border border-red-800">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Mensagem */}
                  {e.mensagem && (
                    <div className="px-5 pb-4">
                      <p className="text-neutral-500 dark:text-neutral-400 text-xs font-mono bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-lg line-clamp-3">
                        {e.mensagem}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
