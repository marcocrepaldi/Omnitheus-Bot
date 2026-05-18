"use client";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import ConfirmModal from "@/components/ConfirmModal";
import { Shield, Plus, Pencil, Trash2, Copy, X, Save, RefreshCw, Lock } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

interface Role {
  id: number; nome: string; slug: string; descricao: string | null;
  sistema: boolean; permissoes: string[]; qtd_times: number;
}
interface Categoria { id: number; nome: string; }

type Catalogo = Record<string, [string, string][]>;

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [catalogo, setCatalogo] = useState<Catalogo>({});
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [editando, setEditando] = useState<Role | null>(null);
  const [form, setForm] = useState({ nome: "", descricao: "", permissoes: [] as string[] });
  const [salvando, setSalvando] = useState(false);
  const [confirmDel, setConfirmDel] = useState<{ open: boolean; id: number; nome: string }>({ open: false, id: 0, nome: "" });

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const { apiFetch } = await import("@/lib/auth");
    return apiFetch(`${API}${path}`, init);
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [r1, r2, r3] = await Promise.all([
      api("/roles/"), api("/roles/permissoes-disponiveis"), api("/categorias/")
    ]);
    setRoles(r1.ok ? await r1.json() : []);
    setCatalogo(r2.ok ? await r2.json() : {});
    setCategorias(r3.ok ? await r3.json() : []);
    setLoading(false);
  }, [api]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirCriar = () => { setEditando(null); setForm({ nome: "", descricao: "", permissoes: [] }); setDrawer(true); };
  const abrirEditar = (r: Role) => { setEditando(r); setForm({ nome: r.nome, descricao: r.descricao ?? "", permissoes: [...r.permissoes] }); setDrawer(true); };

  const toggle = (perm: string) =>
    setForm(f => ({ ...f, permissoes: f.permissoes.includes(perm) ? f.permissoes.filter(p => p !== perm) : [...f.permissoes, perm] }));

  const salvar = async () => {
    if (!form.nome.trim()) return;
    setSalvando(true);
    const path = editando ? `/roles/${editando.id}` : "/roles/";
    const method = editando ? "PUT" : "POST";
    const r = await api(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSalvando(false);
    if (r.ok) { setDrawer(false); carregar(); }
    else { const e = await r.json(); alert(e.detail || "Erro"); }
  };

  const duplicar = async (r: Role) => {
    const res = await api(`/roles/${r.id}/duplicar`, { method: "POST" });
    if (res.ok) carregar();
  };

  const deletar = async () => {
    const r = await api(`/roles/${confirmDel.id}`, { method: "DELETE" });
    if (!r.ok) { const e = await r.json(); alert(e.detail || "Erro"); }
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
              <Shield size={22} className="text-red-500" /> Perfis (Roles)
            </h2>
            <p className="text-neutral-500 text-sm mt-1">Conjunto de permissões — atribuídas a times</p>
          </div>
          <button onClick={abrirCriar}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Novo Perfil
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-neutral-500 text-sm"><RefreshCw size={16} className="animate-spin" />Carregando...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {roles.map(r => (
              <div key={r.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-xl flex flex-col transition-all">
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 bg-purple-900/30 rounded-xl border border-purple-800/50">
                      <Shield size={18} className="text-purple-400" />
                    </div>
                    {r.sistema && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-800">sistema</span>
                    )}
                  </div>
                  <p className="text-neutral-900 dark:text-white font-semibold text-sm">{r.nome}</p>
                  <p className="text-neutral-500 text-xs mt-1 line-clamp-2">{r.descricao || "—"}</p>
                  <div className="mt-3 flex gap-3 text-xs text-neutral-400">
                    <span><strong className="text-neutral-300">{r.permissoes.length}</strong> permissões</span>
                    <span><strong className="text-neutral-300">{r.qtd_times}</strong> times</span>
                  </div>
                </div>
                <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-3 flex justify-between">
                  <button onClick={() => duplicar(r)} title="Duplicar"
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 text-neutral-500 hover:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors">
                    <Copy size={11} /> Duplicar
                  </button>
                  <div className="flex gap-1">
                    <button onClick={() => abrirEditar(r)} className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><Pencil size={14} /></button>
                    {!r.sistema && (
                      <button onClick={() => setConfirmDel({ open: true, id: r.id, nome: r.nome })} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-900/10 rounded-lg"><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setDrawer(false)} />
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                {editando ? `Editar — ${editando.nome}` : "Nova Role"}
              </h3>
              <button onClick={() => setDrawer(false)} className="text-neutral-400 hover:text-white p-1"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {editando?.sistema && (
                <div className="bg-blue-900/20 border border-blue-800/50 text-blue-300 text-xs px-3 py-2 rounded-lg">
                  <Lock size={11} className="inline mr-1" /> Role do sistema — só nome/descrição editáveis. As permissões são fixas.
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-neutral-500 uppercase mb-1.5 block">Nome</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Financeiro"
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 uppercase mb-1.5 block">Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  rows={2}
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-red-500" />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-500 uppercase mb-3 block">Permissões</label>
                <div className="space-y-4">
                  {Object.entries(catalogo).map(([modulo, perms]) => (
                    <div key={modulo} className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
                      <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-2">{modulo}</p>
                      <div className="space-y-1.5">
                        {perms.map(([codigo, descricao]) => (
                          <label key={codigo} className="flex items-start gap-2 text-xs cursor-pointer hover:bg-white dark:hover:bg-neutral-700 rounded px-2 py-1.5">
                            <input type="checkbox"
                              checked={form.permissoes.includes(codigo)}
                              disabled={editando?.sistema}
                              onChange={() => toggle(codigo)}
                              className="mt-0.5 rounded text-red-600" />
                            <div className="flex-1">
                              <p className="text-neutral-700 dark:text-neutral-300 font-medium">{descricao}</p>
                              <code className="text-neutral-500 text-[10px]">{codigo}</code>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Permissões por categoria */}
                  {categorias.length > 0 && (
                    <div className="bg-amber-900/10 border border-amber-900/40 rounded-xl p-4">
                      <p className="text-sm font-semibold text-amber-300 mb-2">Cofre — Permissões por categoria específica</p>
                      <p className="text-xs text-neutral-400 mb-3">Use para restringir acesso a apenas algumas categorias do cofre.</p>
                      <div className="space-y-2">
                        {categorias.map(c => {
                          const view   = `cofre:view@cat:${c.id}`;
                          const reveal = `cofre:reveal@cat:${c.id}`;
                          const write  = `cofre:write@cat:${c.id}`;
                          return (
                            <div key={c.id} className="flex items-center gap-3 text-xs">
                              <span className="text-neutral-300 w-32 truncate">{c.nome}</span>
                              {[
                                ["Ver", view],
                                ["Revelar", reveal],
                                ["Editar", write],
                              ].map(([label, codigo]) => (
                                <label key={codigo} className="flex items-center gap-1 cursor-pointer text-neutral-400">
                                  <input type="checkbox" checked={form.permissoes.includes(codigo)}
                                    disabled={editando?.sistema}
                                    onChange={() => toggle(codigo)}
                                    className="rounded text-red-600" />
                                  {label}
                                </label>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
        titulo="Excluir role"
        descricao={`Excluir "${confirmDel.nome}"?`}
        confirmLabel="Excluir" variante="danger"
        onConfirm={deletar}
        onCancel={() => setConfirmDel(c => ({ ...c, open: false }))} />
    </div>
  );
}
