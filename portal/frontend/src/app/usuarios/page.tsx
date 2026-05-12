"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, Trash2, Users } from "lucide-react";
import { getAccessToken } from "@/lib/auth";

const authHeader = (): Record<string, string> => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const API = process.env.NEXT_PUBLIC_API_URL;
const ROLES = ["viewer", "operator", "admin", "owner"];

interface Usuario { id: number; nome: string; email: string; role: string; ativo: boolean; }

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", senha: "", role: "viewer" });

  const carregar = () => {
    fetch(`${API}/usuarios/`, { headers: authHeader() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setUsuarios(Array.isArray(data) ? data : []));
  };

  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = async () => {
    await fetch(`${API}/usuarios/`, { method: "POST", headers: { ...authHeader(), "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false); setForm({ nome: "", email: "", senha: "", role: "viewer" }); carregar();
  };

  const deletar = async (id: number) => {
    if (!confirm("Excluir este usuário?")) return;
    await fetch(`${API}/usuarios/${id}`, { method: "DELETE", headers: authHeader() });
    carregar();
  };

  const roleBadge = (r: string) => {
    const map: Record<string, string> = { owner: "bg-purple-900 text-purple-300", admin: "bg-blue-900 text-blue-300", operator: "bg-emerald-900 text-emerald-300", viewer: "bg-gray-800 text-gray-400" };
    return map[r] || "bg-gray-800 text-gray-400";
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Usuários</h2>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Novo Usuário
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Novo Usuário</h3>
            <div className="grid grid-cols-2 gap-4">
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Nome" className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 text-sm" />
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="E-mail" type="email" className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 text-sm" />
              <input value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                placeholder="Senha" type="password" className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 text-sm" />
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={salvar} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Salvar</button>
              <button onClick={() => setShowForm(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Cancelar</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {usuarios.length === 0 && <p className="text-gray-500 text-sm">Nenhum usuário cadastrado.</p>}
          {usuarios.map(u => (
            <div key={u.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-800 rounded-lg"><Users size={18} className="text-gray-400" /></div>
                <div>
                  <p className="text-white font-medium">{u.nome}</p>
                  <p className="text-gray-400 text-sm">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${roleBadge(u.role)}`}>{u.role}</span>
                <button onClick={() => deletar(u.id)} className="text-gray-400 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
