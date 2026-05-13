"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ConfirmModal from "@/components/ConfirmModal";
import { Plus, Pencil, Trash2, Bot, Play } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;
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
    if (res.ok) { const data = await res.json(); setRobos(Array.isArray(data) ? data : []); }
  };
  useEffect(() => { carregar(); }, []); // eslint-disable-line

  const salvar = async () => {
    const h = await headers();
    const url = editando ? `${API}/robos/${editando.id}` : `${API}/robos/`;
    const method = editando ? "PUT" : "POST";
    await fetch(url, { method, headers: { ...h, "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false); setEditando(null); setForm({ nome: "", descricao: "", ativo: true }); carregar();
  };

  const deletar = async (id: number) => {
    if (!confirm("Excluir este robô?")) return;
    const h = await headers();
    await fetch(`${API}/robos/${id}`, { method: "DELETE", headers: h }); carregar();
  };

  const editar = (r: Robo) => { setEditando(r); setForm({ nome: r.nome, descricao: r.descricao, ativo: r.ativo }); setShowForm(true); };

  const executar = (id: number) => {
    const robo = robos.find(r => r.id === id);
    setModal({ open: true, roboId: id, roboNome: robo?.nome ?? "" });
  };

  const confirmarExecucao = async () => {
    if (!modal.roboId) return;
    const h = await headers();
    setModal(m => ({ ...m, open: false }));
    await fetch(`${API}/execucoes/robos/${modal.roboId}/executar`, { method: "POST", headers: h });
  };

  const visibles = robos.filter(r => !ROBOS_INTERNOS.has(r.id));

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Robôs</h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Gerencie e execute seus robôs de automação</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditando(null); setForm({ nome: "", descricao: "", ativo: true }); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Novo Robô
          </button>
        </div>

        {/* Formulário */}
        {showForm && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 mb-6 shadow-sm">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-4">
              {editando ? "Editar Robô" : "Novo Robô"}
            </h3>
            <div className="space-y-4">
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Nome do robô"
                className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-red-500" />
              <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descrição" rows={2}
                className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-red-500" />
              <label className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 cursor-pointer">
                <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
                  className="rounded text-red-600" />
                Ativo
              </label>
              <div className="flex gap-3">
                <button onClick={salvar}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">Salvar</button>
                <button onClick={() => setShowForm(false)}
                  className="bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-5 py-2.5 rounded-xl text-sm font-medium">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Grid 3 colunas */}
        {visibles.length === 0 && !showForm ? (
          <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <Bot size={40} className="text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm font-medium">Nenhum robô cadastrado</p>
            <p className="text-neutral-400 text-xs mt-1">Clique em <strong className="text-neutral-300">Novo Robô</strong> para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibles.map(r => (
              <div key={r.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-xl flex flex-col transition-all">
                {/* Topo do card */}
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 bg-red-900/30 rounded-xl">
                      <Bot size={20} className="text-red-400" />
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      r.ativo
                        ? "bg-emerald-900/50 text-emerald-300 border border-emerald-800"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border border-neutral-700"
                    }`}>
                      {r.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="text-neutral-900 dark:text-white font-semibold text-sm">{r.nome}</p>
                  <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-1 line-clamp-2">
                    {r.descricao || "Sem descrição"}
                  </p>
                </div>

                {/* Ações */}
                <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
                  <button
                    onClick={() => executar(r.id)}
                    title="Executar agora"
                    className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-emerald-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-emerald-900/20 px-3 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    <Play size={12} /> Disparar
                  </button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => editar(r)} title="Editar"
                      className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deletar(r.id)} title="Excluir"
                      className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-900/10 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
