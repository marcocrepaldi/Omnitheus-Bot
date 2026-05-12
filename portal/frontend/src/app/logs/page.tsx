"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const API = process.env.NEXT_PUBLIC_API_URL;

interface Execucao {
  id: number; robo_id: number; status: string;
  credenciais_com_erro: string[]; total_erros: number;
  mensagem: string | null; iniciado_em: string; finalizado_em: string;
}

const statusIcon = (s: string) => {
  if (s === "sucesso") return <CheckCircle size={16} className="text-emerald-400" />;
  if (s === "falha") return <XCircle size={16} className="text-red-400" />;
  return <AlertCircle size={16} className="text-yellow-400" />;
};

const statusBadge = (s: string) => {
  if (s === "sucesso") return "bg-emerald-900 text-emerald-300";
  if (s === "falha") return "bg-red-900 text-red-300";
  return "bg-yellow-900 text-yellow-300";
};

export default function LogsPage() {
  const [logs, setLogs] = useState<Execucao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import("@/lib/auth").then(({ authHeader }) => {
      fetch(`${API}/execucoes/?limit=100`, { headers: authHeader() })
        .then(r => r.ok ? r.json() : [])
        .then(data => setLogs(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false));
    });
  }, []);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h2 className="text-2xl font-bold text-white mb-8">Logs de Execução</h2>
        {loading ? <p className="text-gray-500">Carregando...</p> : (
          <div className="space-y-3">
            {logs.length === 0 && <p className="text-gray-500 text-sm">Nenhuma execução registrada.</p>}
            {logs.map(e => (
              <div key={e.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {statusIcon(e.status)}
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge(e.status)}`}>
                      {e.status.toUpperCase()}
                    </span>
                    <span className="text-gray-400 text-sm">Robô #{e.robo_id}</span>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {format(new Date(e.iniciado_em), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </span>
                </div>
                {e.credenciais_com_erro.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {e.credenciais_com_erro.map(c => (
                      <span key={c} className="bg-red-900 text-red-200 text-xs px-2 py-0.5 rounded-full border border-red-800">{c}</span>
                    ))}
                  </div>
                )}
                {e.mensagem && <p className="text-gray-400 text-xs mt-2">{e.mensagem}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
