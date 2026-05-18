"use client";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import ConfirmModal from "@/components/ConfirmModal";
import { Users, Plus, Pencil, Trash2, X, Save, RefreshCw, UserPlus, Shield } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

interface Member { id: number; nome: string; email: string; }
interface RoleS  { id: number; nome: string; slug: string; }
interface Team {
  id: number; nome: string; slug: string; descricao: string | null;
  cor: string | null; membros: Member[]; roles: RoleS[];
}
interface Usuario { id: number; nome: string; email: string; }

const CORES = ["red", "orange", "amber", "emerald", "blue", "purple", "neutral"];
const COR_DOT: Record<string, string> = {
  red: "bg-red-500", orange: "bg-orange-500", amber: "bg-amber-500",
  emerald: "bg-emerald-500", blue: "bg-blue-500", purple: "bg-purple-500",
  neutral: "bg-neutral-500",
};

export default function TimesPage() {
  const [times, setTimes] = useState<Team[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<RoleS[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [editando, setEditando] = useState<Team | null>(null);
  const [form, setForm] = useState({ nome: "", descricao: "", cor: "neutral", member_ids: [] as number[], role_ids: [] as number[] });
  const [salvando, setSalvando] = useState(false);
  const [confirmDel, setConfirmDel] = useState<{ open: boolean; id: number; nome: string }>({ open: false, id: 0, nome: "" });

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const { apiFetch } = await import("@/lib/auth");
    return apiFetch(`${API}${path}`, init);
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [r1, r2, r3] = await Promise.all([api("/teams/"), api("/usuarios/"), api("/roles/")]);
    setTimes(r1.ok ? await r1.json() : []);
    setUsuarios(r2.ok ? await r2.json() : []);
    setRoles(r3.ok ? await r3.json() : []);
    setLoading(false);
  }, [api]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirCriar = () => { setEditando(null); setForm({ nome: "", descricao: "", cor: "neutral", member_ids: [], role_ids: [] }); setDrawer(true); };
  const abrirEditar = (t: Team) => {
    setEditando(t);
    setForm({ nome: t.nome, descricao: t.descricao ?? "", cor: t.cor ?? "neutral",
              member_ids: t.membros.map(m => m.id), role_ids: t.roles.map(r => r.id) });
    setDrawer(true);
  };

  const toggleMember = (id: number) =>
    setForm(f => ({ ...f, member_ids: f.member_ids.includes(id) ? f.member_ids.filter(x => x !== id) : [...f.member_ids, id] }));
  const toggleRole = (id: number) =>
    setForm(f => ({ ...f, role_ids: f.role_ids.includes(id) ? f.role_ids.filter(x => x !== id) : [...f.role_ids, id] }));

  const salvar = async () => {
    if (!form.nome.trim()) return;
    setSalvando(true);
    const path = editando ? `/teams/${editando.id}` : "/teams/";
    const method = editando ? "PUT" : "POST";
    const r = await api(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSalvando(false);
    if (r.ok) { setDrawer(false); carregar(); }
    else { const e = await r.json(); alert(e.detail || "Erro"); }
  };

  const deletar = async () => {
    await api(`/teams/${confirmDel.id}`, { method: "DELETE" });
    setConfirmDel(c => ({ ...c, open: false }));
    carregar();
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-h-screen bg-neutral-50 dark:bg-neutral-950 p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Users size={22} className="text-red-500" /> Times
            </h2>
            <p className="text-neutral-500 text-sm mt-1">Agrupe pessoas e atribua perfis de acesso</p>
          </div>
          <button onClick={abrirCriar}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Novo Time
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-neutral-500 text-sm"><RefreshCw size={16} className="animate-spin" />Carregando...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {times.map(t => (
              <div key={t.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-xl flex flex-col">
                <div className="p-5 flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-3 h-3 rounded-full ${COR_DOT[t.cor ?? "neutral"]} mt-1.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-neutral-900 dark:text-white font-semibold text-sm">{t.nome}</p>
                      <p className="text-neutral-500 text-xs mt-0.5 line-clamp-2">{t.descricao || "—"}</p>
                    </div>
                  </div>
                  {t.roles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {t.roles.map(r => (
                        <span key={r.id} className="text-xs bg-purple-900/30 text-purple-300 border border-purple-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Shield size={9} />{r.nome}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-neutral-500 mt-2">{t.membros.length} {t.membros.length === 1 ? "membro" : "membros"}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.membros.slice(0, 4).map(m => (
                      <span key={m.id} className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full">{m.nome.split(" ")[0]}</span>
                    ))}
                    {t.membros.length > 4 && <span className="text-xs text-neutral-500">+{t.membros.length - 4}</span>}
                  </div>
                </div>
                <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-3 flex justify-end gap-1">
                  <button onClick={() => abrirEditar(t)} className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><Pencil size={14} /></button>
                  <button onClick={() => setConfirmDel({ open: true, id: t.id, nome: t.nome })} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-900/10 rounded-lg"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {drawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setDrawer(false)} />
          <div className="w-full max-w-xl bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="font-semibold text-neutral-900 dark:text-white">{editando ? "Editar Time" : "Novo Time"}</h3>
              <button onClick={() => setDrawer(false)} className="text-neutral-400 hover:text-white p-1"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <label className="text-xs font-medium text-neutral-500 uppercase mb-1.5 block">Nome</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Time Financeiro"
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 uppercase mb-1.5 block">Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  rows={2}
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 uppercase mb-1.5 block">Cor</label>
                <div className="flex gap-2">
                  {CORES.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, cor: c }))}
                      className={`w-8 h-8 rounded-full ${COR_DOT[c]} ${form.cor === c ? "ring-2 ring-offset-2 ring-offset-neutral-900 ring-white" : ""}`} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 uppercase mb-1.5 block">Perfis (Roles) atribuídos</label>
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 space-y-1 max-h-48 overflow-y-auto">
                  {roles.map(r => (
                    <label key={r.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white dark:hover:bg-neutral-700 rounded px-2 py-1.5">
                      <input type="checkbox" checked={form.role_ids.includes(r.id)} onChange={() => toggleRole(r.id)} className="rounded text-red-600" />
                      <Shield size={12} className="text-purple-400" />
                      <span className="text-neutral-700 dark:text-neutral-300">{r.nome}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 uppercase mb-1.5 block">Membros</label>
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 space-y-1 max-h-64 overflow-y-auto">
                  {usuarios.map(u => (
                    <label key={u.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white dark:hover:bg-neutral-700 rounded px-2 py-1.5">
                      <input type="checkbox" checked={form.member_ids.includes(u.id)} onChange={() => toggleMember(u.id)} className="rounded text-red-600" />
                      <UserPlus size={12} className="text-neutral-400" />
                      <span className="text-neutral-700 dark:text-neutral-300 flex-1">{u.nome}</span>
                      <span className="text-neutral-500">{u.email}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 flex gap-3">
              <button onClick={salvar} disabled={salvando || !form.nome.trim()}
                className="flex items-center gap-2 flex-1 justify-center bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold">
                <Save size={15} /> {salvando ? "Salvando..." : (editando ? "Salvar" : "Criar")}
              </button>
              <button onClick={() => setDrawer(false)} className="px-5 py-2.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-sm font-medium">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={confirmDel.open}
        titulo="Excluir time"
        descricao={`Excluir o time "${confirmDel.nome}"? Os membros não serão removidos, mas perderão as permissões deste time.`}
        confirmLabel="Excluir" variante="danger"
        onConfirm={deletar}
        onCancel={() => setConfirmDel(c => ({ ...c, open: false }))} />
    </div>
  );
}
