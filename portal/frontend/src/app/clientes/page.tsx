"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, Building2, Users, Bot, Activity, ToggleLeft, ToggleRight } from "lucide-react";
import { authHeader } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL;

interface Tenant {
  id: number; nome: string; slug: string; plano: string; ativo: boolean;
  criado_em: string; total_usuarios: number; total_robos: number; total_execucoes: number;
}

const planoBadge: Record<string, string> = {
  starter: "bg-neutral-100 dark:bg-neutral-800 text-gray-300",
  pro: "bg-red-900/30 text-blue-300",
  enterprise: "bg-purple-900 text-purple-300",
};

export default function ClientesPage() {
  const [tenants, setTenants]   = useState<Tenant[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [form, setForm] = useState({
    nome: "", slug: "", plano: "starter",
    owner_nome: "", owner_email: "", owner_senha: "",
  });

  const carregar = () =>
    fetch(`${API}/admin/tenants`, { headers: authHeader() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setTenants(Array.isArray(data) ? data : []));

  useEffect(() => { carregar(); }, []); // eslint-disable-line

  const salvar = async () => {
    setLoading(true);
    const res = await fetch(`${API}/admin/tenants`, {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      setShowForm(false);
      setForm({ nome: "", slug: "", plano: "starter", owner_nome: "", owner_email: "", owner_senha: "" });
      carregar();
    } else {
      const err = await res.json();
      alert(err.detail || "Erro ao criar cliente");
    }
  };

  const toggleAtivo = async (id: number) => {
    await fetch(`${API}/admin/tenants/${id}/ativo`, { method: "PATCH", headers: authHeader() });
    carregar();
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Clientes</h2>
            <p className="text-neutral-500 text-sm mt-1">Gestão de tenants da plataforma</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-neutral-900 dark:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Novo Cliente
          </button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-5">Novo Cliente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">Nome da empresa</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Acme Seguros" className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white placeholder-gray-500 text-sm" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">Slug (identificador único)</label>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s/g, '-') }))}
                  placeholder="Ex: acme" className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white placeholder-gray-500 text-sm" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">Plano</label>
                <select value={form.plano} onChange={e => setForm(f => ({ ...f, plano: e.target.value }))}
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white text-sm">
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">Nome do responsável</label>
                <input value={form.owner_nome} onChange={e => setForm(f => ({ ...f, owner_nome: e.target.value }))}
                  placeholder="Nome completo" className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white placeholder-gray-500 text-sm" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">E-mail do responsável</label>
                <input value={form.owner_email} onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))}
                  type="email" placeholder="email@empresa.com" className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white placeholder-gray-500 text-sm" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">Senha inicial</label>
                <input value={form.owner_senha} onChange={e => setForm(f => ({ ...f, owner_senha: e.target.value }))}
                  type="password" placeholder="Senha provisória" className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white placeholder-gray-500 text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={salvar} disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-neutral-900 dark:text-white px-5 py-2 rounded-lg text-sm font-medium">
                {loading ? "Criando..." : "Criar Cliente"}
              </button>
              <button onClick={() => setShowForm(false)} className="bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-600 text-neutral-900 dark:text-white px-4 py-2 rounded-lg text-sm font-medium">Cancelar</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {tenants.length === 0 && <p className="text-neutral-500 text-sm">Nenhum cliente cadastrado.</p>}
          {tenants.map(t => (
            <div key={t.id} className={`bg-white dark:bg-neutral-900 border rounded-xl p-5 ${t.ativo ? "border-neutral-200 dark:border-neutral-800" : "border-neutral-300 dark:border-neutral-700 opacity-60"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg"><Building2 size={20} className="text-gray-300" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-neutral-900 dark:text-white font-semibold">{t.nome}</p>
                      <span className="text-neutral-500 text-xs">/{t.slug}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${planoBadge[t.plano]}`}>{t.plano}</span>
                      {t.id === 1 && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900 text-yellow-300 font-medium">Plataforma</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 text-xs"><Users size={12} /> {t.total_usuarios} usuário(s)</span>
                      <span className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 text-xs"><Bot size={12} /> {t.total_robos} robô(s)</span>
                      <span className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 text-xs"><Activity size={12} /> {t.total_execucoes} execução(ões)</span>
                    </div>
                  </div>
                </div>
                {t.id !== 1 && (
                  <button onClick={() => toggleAtivo(t.id)} title={t.ativo ? "Desativar" : "Ativar"}
                    className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:text-white transition-colors">
                    {t.ativo ? <ToggleRight size={28} className="text-emerald-400" /> : <ToggleLeft size={28} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
