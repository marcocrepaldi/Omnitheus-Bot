"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { CheckCircle, XCircle, AlertCircle, Clock, RefreshCw } from "lucide-react";
import { format, formatDistanceStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

const API = process.env.NEXT_PUBLIC_API_URL;

interface Execucao {
  id: number; robo_id: number; robo_nome: string | null; status: string;
  credenciais_com_erro: string[]; total_erros: number;
  mensagem: string | null; iniciado_em: string; finalizado_em: string | null;
}

const statusIcon = (s: string) => {
  if (s === "sucesso")     return <CheckCircle size={15} className="text-emerald-400" />;
  if (s === "falha")       return <XCircle size={15} className="text-red-400" />;
  if (s === "em_execucao") return <RefreshCw size={15} className="text-blue-400 animate-spin" />;
  return <AlertCircle size={15} className="text-yellow-400" />;
};

const statusBadge = (s: string) => {
  if (s === "sucesso")     return "bg-emerald-900/60 text-emerald-300 border border-emerald-800";
  if (s === "falha")       return "bg-red-900/60 text-red-300 border border-red-800";
  if (s === "em_execucao") return "bg-blue-900/60 text-blue-300 border border-blue-800";
  return "bg-yellow-900/60 text-yellow-300 border border-yellow-800";
};

function duracao(inicio: string, fim: string | null) {
  if (!fim) return null;
  try {
    return formatDistanceStrict(new Date(fim), new Date(inicio), { locale: ptBR });
  } catch { return null; }
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Execucao[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = () => {
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
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Logs de Execução</h2>
          <button onClick={carregar}
            className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded-lg transition-colors">
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>

        {loading ? <p className="text-neutral-500">Carregando...</p> : (
          <div className="space-y-3">
            {logs.length === 0 && <p className="text-neutral-500 text-sm">Nenhuma execução registrada.</p>}
            {logs.map(e => (
              <div key={e.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcon(e.status)}
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusBadge(e.status)}`}>
                      {e.status.toUpperCase().replace("_", " ")}
                    </span>
                    <span className="text-neutral-900 dark:text-white text-sm font-medium">
                      {e.robo_nome ?? `Robô #${e.robo_id}`}
                    </span>
                    <span className="text-neutral-400 dark:text-neutral-600 text-xs font-mono bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                      EX-{String(e.id).padStart(4, "0")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-500">
                    {duracao(e.iniciado_em, e.finalizado_em) && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {duracao(e.iniciado_em, e.finalizado_em)}
                      </span>
                    )}
                    <span>{format(new Date(e.iniciado_em), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</span>
                  </div>
                </div>

                {e.credenciais_com_erro.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {e.credenciais_com_erro.map(c => (
                      <span key={c} className="bg-red-900/50 text-red-200 text-xs px-2.5 py-0.5 rounded-full border border-red-800">{c}</span>
                    ))}
                  </div>
                )}

                {e.mensagem && (
                  <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-2 font-mono bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-lg">
                    {e.mensagem}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
