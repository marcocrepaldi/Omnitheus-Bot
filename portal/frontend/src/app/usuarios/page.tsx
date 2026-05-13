"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ConfirmModal from "@/components/ConfirmModal";
import { authHeader, getUser } from "@/lib/auth";
import { Plus, Trash2, Users, KeyRound, Check, X, Pencil } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;
const ROLES_POR_NIVEL: Record<string, string[]> = {
  owner: ["viewer", "operator", "admin", "owner"],
  admin: ["viewer", "operator", "admin"],
};

interface Usuario { id: number; nome: string; email: string; role: string; ativo: boolean; }

const roleBadge = (r: string) => {
  const map: Record<string, string> = {
    owner:    "bg-purple-900/50 text-purple-300 border border-purple-800",
    admin:    "bg-blue-900/50 text-blue-300 border border-blue-800",
    operator: "bg-emerald-900/50 text-emerald-300 border border-emerald-800",
    viewer:   "bg-neutral-800 text-neutral-400 border border-neutral-700",
  };
  return map[r] || "bg-neutral-800 text-neutral-400";
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ nome: "", email: "", senha: "", role: "viewer" });
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");

  // Troca de senha inline
  const [trocandoSenha, setTrocandoSenha]   = useState<number | null>(null);
  const [novaSenha, setNovaSenha]           = useState("");
  const [salvandoSenha, setSalvandoSenha]   = useState(false);
  const [senhaOk, setSenhaOk]               = useState<number | null>(null);

  // Modal exclusão
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
    if (!r.ok) {
      const err = await r.json();
      setErroForm(err.detail || "Erro ao criar usuário.");
      return;
    }
    setShowForm(false);
    setForm({ nome: "", email: "", senha: "", role: "viewer" });
    carregar();
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
    if (r.ok) {
      setSenhaOk(uid);
      setTrocandoSenha(null);
      setNovaSenha("");
      setTimeout(() => setSenhaOk(null), 3000);
    }
  };

  const deletar = async () => {
    await fetch(`${API}/usuarios/${confirmDel.id}`, { method: "DELETE", headers: h() });
    setConfirmDel(c => ({ ...c, open: false }));
    carregar();
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
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
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Novo Usuário</h3>
            {erroForm && <p className="text-red-400 text-sm mb-3 bg-red-900/20 px-3 py-2 rounded-lg">{erroForm}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Nome *</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome completo"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">E-mail *</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@empresa.com" type="email"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Senha *</label>
                <input value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                  placeholder="Mínimo 6 caracteres" type="password"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Perfil de acesso</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500">
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <p className="text-xs text-neutral-600 mt-1">viewer = só leitura · operator = dispara robôs · admin = gerencia usuários</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={salvar} disabled={salvando}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
                <Plus size={14} /> {salvando ? "Criando..." : "Criar Usuário"}
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 px-5 py-2.5 rounded-lg text-sm font-medium">
                <X size={14} /> Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista de usuários */}
        {loading ? <p className="text-neutral-500 text-sm">Carregando...</p> : (
          <div className="space-y-3">
            {usuarios.length === 0 && <p className="text-neutral-500 text-sm">Nenhum usuário cadastrado.</p>}
            {usuarios.map(u => (
              <div key={u.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-neutral-800 rounded-lg">
                      <Users size={18} className="text-neutral-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{u.nome}</p>
                        {senhaOk === u.id && (
                          <span className="flex items-center gap-1 text-emerald-400 text-xs">
                            <Check size={12} /> Senha atualizada
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-500 text-sm">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${roleBadge(u.role)}`}>
                      {u.role}
                    </span>
                    {/* Botão trocar senha */}
                    <button
                      onClick={() => { setTrocandoSenha(trocandoSenha === u.id ? null : u.id); setNovaSenha(""); }}
                      title="Redefinir senha"
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                        trocandoSenha === u.id
                          ? "bg-blue-900/40 text-blue-300 border border-blue-800"
                          : "bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700"
                      }`}>
                      <KeyRound size={12} /> Senha
                    </button>
                    {/* Deletar */}
                    <button
                      onClick={() => setConfirmDel({ open: true, id: u.id, nome: u.nome })}
                      className="text-neutral-600 hover:text-red-500 transition-colors p-1.5">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Formulário inline de troca de senha */}
                {trocandoSenha === u.id && (
                  <div className="mt-4 pt-4 border-t border-neutral-800 flex items-center gap-3">
                    <KeyRound size={14} className="text-neutral-500 shrink-0" />
                    <input
                      type="password"
                      value={novaSenha}
                      onChange={e => setNovaSenha(e.target.value)}
                      placeholder="Nova senha (mín. 6 caracteres)"
                      onKeyDown={e => e.key === "Enter" && trocarSenha(u.id)}
                      className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={() => trocarSenha(u.id)}
                      disabled={salvandoSenha || novaSenha.length < 6}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      <Check size={14} /> {salvandoSenha ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      onClick={() => { setTrocandoSenha(null); setNovaSenha(""); }}
                      className="text-neutral-500 hover:text-white p-2 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <ConfirmModal
        open={confirmDel.open}
        titulo="Excluir usuário"
        descricao={`Excluir permanentemente o usuário ${confirmDel.nome}? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variante="danger"
        onConfirm={deletar}
        onCancel={() => setConfirmDel(c => ({ ...c, open: false }))}
      />
    </div>
  );
}
