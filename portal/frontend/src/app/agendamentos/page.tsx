"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, Trash2, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const API = process.env.NEXT_PUBLIC_API_URL;

interface Agendamento {
  id: number; robo_id: number; cron_expr: string;
  ativo: boolean; proximo_run: string | null; criado_em: string;
}
interface Robo { id: number; nome: string; }

const EXEMPLOS = [
  { label: "Todo dia às 08:00", valor: "0 8 * * *" },
  { label: "Todo dia às 18:00", valor: "0 18 * * *" },
  { label: "Seg a Sex às 09:00", valor: "0 9 * * 1-5" },
  { label: "A cada hora", valor: "0 * * * *" },
];

export default function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [robos, setRobos] = useState<Robo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ robo_id: 0, cron_expr: "", ativo: true });

  const carregar = () => {
    import("@/lib/auth").then(({ authHeader }) => {
      const h = authHeader();
      fetch(`${API}/agendamentos/`, { headers: h })
        .then(r => r.ok ? r.json() : [])
        .then(data => setAgendamentos(Array.isArray(data) ? data : []));
      fetch(`${API}/robos/`, { headers: h })
        .then(r => r.ok ? r.json() : [])
        .then(data => setRobos(Array.isArray(data) ? data : []));
    });
  };
  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    const { authHeader } = await import("@/lib/auth");
    await fetch(`${API}/agendamentos/`, { method: "POST", headers: { ...authHeader(), "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false); setForm({ robo_id: 0, cron_expr: "", ativo: true }); carregar();
  };

  const deletar = async (id: number) => {
    if (!confirm("Excluir este agendamento?")) return;
    const { authHeader } = await import("@/lib/auth");
    await fetch(`${API}/agendamentos/${id}`, { method: "DELETE", headers: authHeader() });
    carregar();
  };

  const nomeRobo = (id: number) => robos.find(r => r.id === id)?.nome ?? `#${id}`;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Agendamentos</h2>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-neutral-900 dark:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Novo Agendamento
          </button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Novo Agendamento</h3>
            <div className="space-y-4">
              <select value={form.robo_id} onChange={e => setForm(f => ({ ...f, robo_id: Number(e.target.value) }))}
                className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white text-sm">
                <option value={0}>Selecione o robô...</option>
                {robos.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
              <div>
                <input value={form.cron_expr} onChange={e => setForm(f => ({ ...f, cron_expr: e.target.value }))}
                  placeholder="Expressão Cron (ex: 0 8 * * *)" className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white placeholder-gray-500 text-sm" />
                <div className="flex flex-wrap gap-2 mt-2">
                  {EXEMPLOS.map(ex => (
                    <button key={ex.valor} onClick={() => setForm(f => ({ ...f, cron_expr: ex.valor }))}
                      className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:bg-neutral-700 text-gray-300 text-xs px-3 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700">
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={salvar} className="bg-red-600 hover:bg-red-700 text-neutral-900 dark:text-white px-4 py-2 rounded-lg text-sm font-medium">Salvar</button>
                <button onClick={() => setShowForm(false)} className="bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-600 text-neutral-900 dark:text-white px-4 py-2 rounded-lg text-sm font-medium">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {agendamentos.length === 0 && <p className="text-neutral-500 text-sm">Nenhum agendamento configurado.</p>}
          {agendamentos.map(ag => (
            <div key={ag.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-900 rounded-lg"><CalendarClock size={20} className="text-purple-400" /></div>
                <div>
                  <p className="text-neutral-900 dark:text-white font-medium">{nomeRobo(ag.robo_id)}</p>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm font-mono">{ag.cron_expr}</p>
                  {ag.proximo_run && (
                    <p className="text-neutral-500 text-xs mt-0.5">
                      Próximo: {format(new Date(ag.proximo_run), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs px-2 py-1 rounded-full ${ag.ativo ? "bg-emerald-900 text-emerald-300" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"}`}>
                  {ag.ativo ? "Ativo" : "Inativo"}
                </span>
                <button onClick={() => deletar(ag.id)} className="text-neutral-500 dark:text-neutral-400 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
