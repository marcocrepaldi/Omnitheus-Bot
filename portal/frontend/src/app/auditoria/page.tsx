"use client";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Activity, RefreshCw, Eye, Edit, Trash2, Plus, Search, Filter, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const API = process.env.NEXT_PUBLIC_API_URL;

interface AuditOut {
  id: number; usuario_id: number | null; usuario_nome: string | null;
  acao: string; recurso_tipo: string | null; recurso_id: number | null;
  detalhes: any; ip: string | null; criado_em: string;
}

const ICONE_ACAO: Record<string, any> = {
  "cofre:reveal": Eye,
  "cofre:edit":   Edit,
  "cofre:create": Plus,
  "cofre:delete": Trash2,
};
const COR_ACAO: Record<string, string> = {
  "cofre:reveal": "text-yellow-400",
  "cofre:edit":   "text-blue-400",
  "cofre:create": "text-emerald-400",
  "cofre:delete": "text-red-400",
};
const LABEL_ACAO: Record<string, string> = {
  "cofre:reveal": "Revelou senha",
  "cofre:edit":   "Editou item",
  "cofre:create": "Criou item",
  "cofre:delete": "Excluiu item",
  "tenant:owner-transferido": "Transferiu ownership",
};

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroAcao, setFiltroAcao] = useState("");
  const [filtroDias, setFiltroDias] = useState(7);

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const { apiFetch } = await import("@/lib/auth");
    return apiFetch(`${API}${path}`, init);
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ dias: filtroDias.toString() });
    if (filtroAcao) p.set("acao", filtroAcao);
    const r = await api(`/audit/?${p}`);
    setLogs(r.ok ? await r.json() : []);
    setLoading(false);
  }, [api, filtroAcao, filtroDias]);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-h-screen bg-neutral-50 dark:bg-neutral-950 p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Activity size={22} className="text-red-500" /> Auditoria
            </h2>
            <p className="text-neutral-500 text-sm mt-1">Registro de ações sensíveis · revelações de senhas, edições e exclusões</p>
          </div>
          <button onClick={carregar}
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-white bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-3 py-2 rounded-lg">
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input value={filtroAcao} onChange={e => setFiltroAcao(e.target.value)}
              placeholder="Filtrar por ação (ex: cofre:reveal)"
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-red-500" />
          </div>
          <select value={filtroDias} onChange={e => setFiltroDias(parseInt(e.target.value))}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300">
            <option value={1}>Últimas 24h</option>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-neutral-500 text-sm"><RefreshCw size={16} className="animate-spin" />Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <Filter size={40} className="text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">Nenhum registro nos filtros atuais</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
            {logs.map((log, i) => {
              const Icon = ICONE_ACAO[log.acao] ?? Activity;
              const cor  = COR_ACAO[log.acao] ?? "text-neutral-400";
              const label = LABEL_ACAO[log.acao] ?? log.acao;
              return (
                <div key={log.id} className={`flex items-center gap-4 px-5 py-3 ${i > 0 ? "border-t border-neutral-100 dark:border-neutral-800" : ""} hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors`}>
                  <Icon size={16} className={`shrink-0 ${cor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-medium text-neutral-900 dark:text-white">{log.usuario_nome ?? "—"}</span>
                      <span className={`text-xs ${cor}`}>{label}</span>
                      {log.detalhes?.item_nome && <span className="text-xs text-neutral-500">— {log.detalhes.item_nome}</span>}
                      {log.detalhes?.nome && <span className="text-xs text-neutral-500">— {log.detalhes.nome}</span>}
                      {log.detalhes?.campo && <span className="text-xs text-neutral-400">[campo: {log.detalhes.campo}]</span>}
                    </div>
                    <div className="flex gap-3 text-xs text-neutral-500 mt-0.5">
                      <span>{format(new Date(log.criado_em), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</span>
                      {log.ip && <span className="font-mono">{log.ip}</span>}
                      <code className="text-neutral-500">{log.acao}</code>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
