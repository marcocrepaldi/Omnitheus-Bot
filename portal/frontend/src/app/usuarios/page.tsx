"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ConfirmModal from "@/components/ConfirmModal";
import { authHeader, getUser } from "@/lib/auth";
import { Plus, Trash2, KeyRound, Check, X, Users } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;
const ROLES_POR_NIVEL: Record<string, string[]> = {
  owner: ["cofre", "viewer", "operator", "admin", "owner"],
  admin: ["cofre", "viewer", "operator", "admin"],
};

interface Usuario { id: number; nome: string; email: string; role: string; ativo: boolean; }

const ROLE_CFG: Record<string, { label: string; cls: string }> = {
  owner:    { label: "Owner",        cls: "bg-purple-900/50 text-purple-300 border border-purple-800" },
  admin:    { label: "Admin",        cls: "bg-blue-900/50 text-blue-300 border border-blue-800" },
  operator: { label: "Operator",     cls: "bg-emerald-900/50 text-emerald-300 border border-emerald-800" },
  viewer:   { label: "Viewer",       cls: "bg-neutral-800 text-neutral-400 border border-neutral-700" },
  cofre:    { label: "Cofre",        cls: "bg-amber-900/50 text-amber-300 border border-amber-800" },
};

function Initials({ nome }: { nome: string }) {
  const parts = nome.trim().split(" ");
  const ini = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0].substring(0, 2);
  return (
    <div className="w-10 h-10 rounded-xl bg-red-900/40 flex items-center justify-center shrink-0">
      <span className="text-red-300 text-sm font-bold uppercase">{ini}</span>
    </div>
  );
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ nome: "", email: "", senha: "", role: "viewer" });
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");

  const [trocandoSenha, setTrocandoSenha] = useState<number | null>(null);
  const [novaSenha, setNovaSenha]         = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [senhaOk, setSenhaOk]             = useState<number | null>(null);

  const [confirmDel, setConfirmDel] = useState<{ open: boolean; id: number; nome: string }>({ open: false, id: 0, nome: "" });

  const eu = getUser();
  const roles = ROLES_POR_NIVEL[eu?.role ?? "admin"] ?? ["viewer", "operator"];
  const h = () => authHeader();

  const carregar = () => {
    setLoading(true);
    fetch(`${API}/usuarios/`, { headers: h() })
      .then(r => r.ok ? r.json() : [])
      .then(d => setUsuarios(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    setErroForm("");
    if (!form.nome || !form.email || !form.senha) { setErroForm("Preencha nome, e-mail e senha."); return; }
    setSalvando(true);
    const r = await fetch(`${API}/usuarios/`, {
      method: "POST",
      headers: { ...h(), "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSalvando(false);
    if (!r.ok) { const err = await r.json(); setErroForm(err.detail || "Erro ao criar usuário."); return; }
    setShowForm(false); setForm({ nome: "", email: "", senha: "", role: "viewer" }); carregar();
  };

  const trocarSenha = async (uid: number) => {
    if (!novaSenha || novaSenha.length < 6) return;
    setSalvandoSenha(true);
    const r = await fetch(`${API}/usuarios/${uid}/senha`, {
      method: "PATCH",
      headers: { ...h(), "Content-Type": "application/json" },
      body: JSON.stringify({ nova_senha: novaSenha }),
    });
    setSalvandoSenha(false);
    if (r.ok) { setSenhaOk(uid); setTrocandoSenha(null); setNovaSenha(""); setTimeout(() => setSenhaOk(null), 3000); }
  };

  const deletar = async () => {
    await fetch(`${API}/usuarios/${confirmDel.id}`, { method: "DELETE", headers: h() });
    setConfirmDel(c => ({ ...c, open: false })); carregar();
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Usuários</h2>
            <p className="text-neutral-500 text-sm mt-1">Gerencie os acessos da sua equipe</p>
          </div>
          <button onClick={() => { setShowForm(true); setErroForm(""); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Novo Usuário
          </button>
        </div>

        {/* Formulário novo usuário */}
        {showForm && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 mb-6 shadow-sm">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-4">Novo Usuário</h3>
            {erroForm && <p className="text-red-400 text-sm mb-3 bg-red-900/20 px-3 py-2 rounded-lg">{erroForm}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Nome *</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome completo"
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">E-mail *</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@empresa.com" type="email"
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Senha *</label>
                <input value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                  placeholder="Mínimo 6 caracteres" type="password"
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Perfil de acesso</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500">
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <p className="text-xs text-neutral-600 mt-1">cofre = só cofre · viewer = leitura · operator = dispara · admin = gerencia</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={salvar} disabled={salvando}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
                <Plus size={14} /> {salvando ? "Criando..." : "Criar Usuário"}
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex items-center gap-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-400 px-5 py-2.5 rounded-xl text-sm font-medium">
                <X size={14} /> Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Grid 3 colunas */}
        {loading ? <p className="text-neutral-500 text-sm">Carregando...</p> : (
          <>
            {usuarios.length === 0 && (
              <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <Users size={40} className="text-neutral-400 mx-auto mb-3" />
                <p className="text-neutral-500 text-sm font-medium">Nenhum usuário cadastrado</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {usuarios.map(u => {
                const cfg = ROLE_CFG[u.role] ?? { label: u.role, cls: "bg-neutral-800 text-neutral-400" };
                return (
                  <div key={u.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-xl flex flex-col transition-all">
                    <div className="p-5 flex-1">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Initials nome={u.nome} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-neutral-900 dark:text-white font-semibold text-sm truncate">{u.nome}</p>
                              {senhaOk === u.id && (
                                <span className="flex items-center gap-1 text-emerald-400 text-xs shrink-0">
                                  <Check size={11} /> Senha atualizada
                                </span>
                              )}
                            </div>
                            <p className="text-neutral-500 text-xs truncate">{u.email}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ml-2 ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </div>

                      {/* Troca de senha inline */}
                      {trocandoSenha === u.id && (
                        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                          <div className="flex items-center gap-2">
                            <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                              placeholder="Nova senha (mín. 6 chars)"
                              onKeyDown={e => e.key === "Enter" && trocarSenha(u.id)}
                              className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                              autoFocus />
                            <button onClick={() => trocarSenha(u.id)} disabled={salvandoSenha || novaSenha.length < 6}
                              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors">
                              <Check size={12} /> {salvandoSenha ? "..." : "OK"}
                            </button>
                            <button onClick={() => { setTrocandoSenha(null); setNovaSenha(""); }}
                              className="text-neutral-500 hover:text-white p-2 transition-colors">
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
                      <button
                        onClick={() => { setTrocandoSenha(trocandoSenha === u.id ? null : u.id); setNovaSenha(""); }}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
                          trocandoSenha === u.id
                            ? "bg-blue-900/40 text-blue-300 border border-blue-800"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        }`}>
                        <KeyRound size={12} /> Redefinir senha
                      </button>
                      <button onClick={() => setConfirmDel({ open: true, id: u.id, nome: u.nome })}
                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-900/10 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <ConfirmModal
        open={confirmDel.open}
        titulo="Excluir usuário"
        descricao={`Excluir permanentemente ${confirmDel.nome}? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variante="danger"
        onConfirm={deletar}
        onCancel={() => setConfirmDel(c => ({ ...c, open: false }))}
      />
    </div>
  );
}
