"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ConfirmModal from "@/components/ConfirmModal";
import { Plus, Pencil, Trash2, Bot, Play } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

// Robôs internos do fluxo de Rotação Completa — não exibidos para o usuário
const ROBOS_INTERNOS = new Set([2, 3]);

interface Robo { id: number; nome: string; descricao: string; ativo: boolean; criado_em: string; }

export default function RobosPage() {
  const [robos, setRobos] = useState<Robo[]>([]);
  const [modal, setModal] = useState<{ open: boolean; roboId: number | null; roboNome: string }>({ open: false, roboId: null, roboNome: "" });
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Robo | null>(null);
  const [form, setForm] = useState({ nome: "", descricao: "", ativo: true });

  const headers = () => import("@/lib/auth").then(m => m.authHeader());

  const carregar = async () => {
    const h = await headers();
    const res = await fetch(`${API}/robos/`, { headers: h });
    if (res.ok) {
      const data = await res.json();
      setRobos(Array.isArray(data) ? data : []);
    }
  };
  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = async () => {
    const h = await headers();
    const url = editando ? `${API}/robos/${editando.id}` : `${API}/robos/`;
    const method = editando ? "PUT" : "POST";
    await fetch(url, { method, headers: { ...h, "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false); setEditando(null); setForm({ nome: "", descricao: "", ativo: true });
    carregar();
  };

  const deletar = async (id: number) => {
    if (!confirm("Excluir este robô?")) return;
    const h = await headers();
    await fetch(`${API}/robos/${id}`, { method: "DELETE", headers: h });
    carregar();
  };

  const editar = (r: Robo) => { setEditando(r); setForm({ nome: r.nome, descricao: r.descricao, ativo: r.ativo }); setShowForm(true); };

  const executar = async (id: number) => {
    const robo = robos.find(r => r.id === id);
    setModal({ open: true, roboId: id, roboNome: robo?.nome ?? "" });
  };

  const confirmarExecucao = async () => {
    if (!modal.roboId) return;
    const h = await headers();
    setModal(m => ({ ...m, open: false }));
    await fetch(`${API}/execucoes/robos/${modal.roboId}/executar`, { method: "POST", headers: h });
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Robôs</h2>
          <button onClick={() => { setShowForm(true); setEditando(null); setForm({ nome: "", descricao: "", ativo: true }); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-neutral-900 dark:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Novo Robô
          </button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">{editando ? "Editar Robô" : "Novo Robô"}</h3>
            <div className="space-y-4">
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Nome do robô" className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-red-500" />
              <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descrição" rows={2} className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-red-500" />
              <label className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 cursor-pointer">
                <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="rounded text-red-600 focus:ring-red-500 bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700" />
                Ativo
              </label>
              <div className="flex gap-3">
                <button onClick={salvar} className="bg-red-600 hover:bg-red-700 text-neutral-900 dark:text-white px-4 py-2 rounded-lg text-sm font-medium">Salvar</button>
                <button onClick={() => setShowForm(false)} className="bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-600 text-neutral-900 dark:text-white px-4 py-2 rounded-lg text-sm font-medium">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {robos.filter(r => !ROBOS_INTERNOS.has(r.id)).length === 0 && <p className="text-neutral-500 text-sm">Nenhum robô cadastrado.</p>}
          {robos.filter(r => !ROBOS_INTERNOS.has(r.id)).map(r => (
            <div key={r.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-red-900/40 rounded-lg"><Bot size={20} className="text-red-500" /></div>
                <div>
                  <p className="text-neutral-900 dark:text-white font-medium">{r.nome}</p>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm">{r.descricao || "Sem descrição"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs px-2 py-1 rounded-full ${r.ativo ? "bg-red-900/50 text-red-300" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"}`}>
                  {r.ativo ? "Ativo" : "Inativo"}
                </span>
                <button onClick={() => executar(r.id)} title="Executar agora"
                  className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:text-white transition-colors"><Play size={16} /></button>
                <button onClick={() => editar(r)} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:text-white transition-colors"><Pencil size={16} /></button>
                <button onClick={() => deletar(r.id)} className="text-neutral-500 dark:text-neutral-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <ConfirmModal
        open={modal.open}
        titulo="Disparar robô"
        descricao={`Confirma a execução de "${modal.roboNome}" agora? O resultado aparecerá em Logs em instantes.`}
        confirmLabel="Disparar"
        cancelLabel="Cancelar"
        onConfirm={confirmarExecucao}
        onCancel={() => setModal(m => ({ ...m, open: false }))}
      />
    </div>
  );
}
