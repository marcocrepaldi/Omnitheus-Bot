"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, Pencil, Trash2, Bot, Play } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

interface Robo { id: number; nome: string; descricao: string; ativo: boolean; criado_em: string; }

export default function RobosPage() {
  const [robos, setRobos] = useState<Robo[]>([]);
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
    if (!confirm("Disparar o robô agora?")) return;
    const h = await headers();
    await fetch(`${API}/execucoes/robos/${id}/executar`, { method: "POST", headers: h });
    alert("Robô disparado! Acompanhe em Logs.");
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Robôs</h2>
          <button onClick={() => { setShowForm(true); setEditando(null); setForm({ nome: "", descricao: "", ativo: true }); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Novo Robô
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">{editando ? "Editar Robô" : "Novo Robô"}</h3>
            <div className="space-y-4">
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Nome do robô" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 text-sm" />
              <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descrição" rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 text-sm" />
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="rounded" />
                Ativo
              </label>
              <div className="flex gap-3">
                <button onClick={salvar} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Salvar</button>
                <button onClick={() => setShowForm(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {robos.length === 0 && <p className="text-gray-500 text-sm">Nenhum robô cadastrado.</p>}
          {robos.map(r => (
            <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-900 rounded-lg"><Bot size={20} className="text-blue-400" /></div>
                <div>
                  <p className="text-white font-medium">{r.nome}</p>
                  <p className="text-gray-400 text-sm">{r.descricao || "Sem descrição"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs px-2 py-1 rounded-full ${r.ativo ? "bg-emerald-900 text-emerald-300" : "bg-gray-800 text-gray-400"}`}>
                  {r.ativo ? "Ativo" : "Inativo"}
                </span>
                <button onClick={() => executar(r.id)} title="Executar agora"
                  className="text-gray-400 hover:text-emerald-400 transition-colors"><Play size={16} /></button>
                <button onClick={() => editar(r)} className="text-gray-400 hover:text-white transition-colors"><Pencil size={16} /></button>
                <button onClick={() => deletar(r.id)} className="text-gray-400 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
