"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ConfirmModal from "@/components/ConfirmModal";
import { authHeader } from "@/lib/auth";
import { ShieldCheck, Plus, Eye, EyeOff, RefreshCw, RotateCcw, Trash2, Save, X, KeyRound, ExternalLink, Zap, CheckCircle, XCircle, Pencil, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const API = process.env.NEXT_PUBLIC_API_URL;

interface Cofre {
  id: number;
  seguradora_nome: string;
  login: string | null;
  url_portal: string | null;
  observacao: string | null;
  tem_senha_anterior: boolean;
  atualizado_em: string | null;
  criado_em: string;
}

const emptyForm = { seguradora_nome: "", login: "", senha: "", url_portal: "", observacao: "" };

export default function CofrePage() {
  const [itens, setItens]           = useState<Cofre[]>([]);
  const [busca, setBusca]           = useState("");
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [salvando, setSalvando]     = useState(false);
  const [senhasVisiveis, setSenhasVisiveis] = useState<Record<number, string>>({});
  const [loadingSenha, setLoadingSenha]     = useState<number | null>(null);
  const [copiado, setCopiado]               = useState<number | null>(null);
  const [rotacionando, setRotacionando]       = useState<number | null>(null);
  const [novaSenhaGerada, setNovaSenhaGerada] = useState<{ id: number; nome: string; senha: string } | null>(null);
  const [editando, setEditando] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ login: string; senha: string; url_portal: string; observacao: string }>({ login: "", senha: "", url_portal: "", observacao: "" });
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [rotacaoCompleta, setRotacaoCompleta] = useState<{
    id: number; nome: string;
    ex2: number; ex3: number;
    status: "rodando" | "sucesso" | "erro";
    etapa: string;
  } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; id: number; acao: "rollback" | "deletar"; nome: string }>({
    open: false, id: 0, acao: "deletar", nome: "",
  });

  const h = () => authHeader();

  const carregar = () => {
    setLoading(true);
    fetch(`${API}/cofre/`, { headers: h() })
      .then(r => r.ok ? r.json() : [])
      .then(d => setItens(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    if (!form.seguradora_nome || !form.senha) return;
    setSalvando(true);
    await fetch(`${API}/cofre/`, {
      method: "POST",
      headers: { ...h(), "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSalvando(false);
    setShowForm(false);
    setForm(emptyForm);
    carregar();
  };

  const verSenha = async (id: number) => {
    if (senhasVisiveis[id]) {
      setSenhasVisiveis(s => { const n = { ...s }; delete n[id]; return n; });
      return;
    }
    setLoadingSenha(id);
    const r = await fetch(`${API}/cofre/${id}/senha`, { headers: h() });
    if (r.ok) {
      const d = await r.json();
      setSenhasVisiveis(s => ({ ...s, [id]: d.senha }));
    }
    setLoadingSenha(null);
  };

  const rotacionar = async (item: Cofre) => {
    setRotacionando(item.id);
    const r = await fetch(`${API}/cofre/${item.id}/rotacionar`, { method: "POST", headers: h() });
    if (r.ok) {
      const d = await r.json();
      setNovaSenhaGerada({ id: item.id, nome: item.seguradora_nome, senha: d.senha_nova });
      carregar();
    }
    setRotacionando(null);
  };

  const iniciarRotacaoCompleta = async (item: Cofre) => {
    const r = await fetch(`${API}/cofre/${item.id}/rotacao-completa`, { method: "POST", headers: h() });
    if (!r.ok) {
      const err = await r.json();
      alert(err.detail || "Erro ao iniciar rotação.");
      return;
    }
    const d = await r.json();
    setRotacaoCompleta({ id: item.id, nome: item.seguradora_nome, ex2: d.execucao_robo2_id, ex3: d.execucao_robo3_id, status: "rodando", etapa: "Robô 2 — Trocando senha no portal..." });

    // Polling das execuções
    const poll = async () => {
      let tentativas = 0;
      while (tentativas < 80) {
        await new Promise(res => setTimeout(res, 8000));
        tentativas++;
        const resp = await fetch(`${API}/execucoes/?limit=50`, { headers: h() });
        if (!resp.ok) continue;
        const execucoes: any[] = await resp.json();
        const ex2 = execucoes.find((e: any) => e.id === d.execucao_robo2_id);
        const ex3 = execucoes.find((e: any) => e.id === d.execucao_robo3_id);

        if (ex2?.status === "erro") {
          setRotacaoCompleta(rc => rc ? ({ ...rc, status: "erro", etapa: `Robô 2 falhou: ${ex2.mensagem}` }) : rc);
          carregar(); return;
        }
        if (ex2?.status === "sucesso" && ex3?.status === "em_execucao") {
          setRotacaoCompleta(rc => rc ? ({ ...rc, etapa: "Robô 3 — Atualizando no Quiver..." }) : rc);
        }
        if (ex3?.status === "erro") {
          setRotacaoCompleta(rc => rc ? ({ ...rc, status: "erro", etapa: `Robô 3 falhou: ${ex3.mensagem}` }) : rc);
          carregar(); return;
        }
        if (ex3?.status === "sucesso") {
          setRotacaoCompleta(rc => rc ? ({ ...rc, status: "sucesso", etapa: "Rotação completa! Senha atualizada no portal e no Quiver." }) : rc);
          carregar(); return;
        }
      }
      setRotacaoCompleta(rc => rc ? ({ ...rc, status: "erro", etapa: "Timeout — verifique os Logs." }) : rc);
    };
    poll();
  };

  const abrirEdicao = (item: Cofre) => {
    setEditando(item.id);
    setEditForm({ login: item.login || "", senha: "", url_portal: item.url_portal || "", observacao: item.observacao || "" });
  };

  const salvarEdicao = async (item: Cofre) => {
    if (!editForm.senha) { alert("Preencha a senha para salvar."); return; }
    setSalvandoEdit(true);
    await fetch(`${API}/cofre/`, {
      method: "POST",
      headers: { ...h(), "Content-Type": "application/json" },
      body: JSON.stringify({
        seguradora_nome: item.seguradora_nome,
        login: editForm.login || item.login,
        senha: editForm.senha,
        url_portal: editForm.url_portal || item.url_portal,
        observacao: editForm.observacao !== item.observacao ? editForm.observacao : item.observacao,
      }),
    });
    setSalvandoEdit(false);
    setEditando(null);
    carregar();
  };

  const confirmarAcao = async () => {
    const { id, acao } = confirmModal;
    setConfirmModal(c => ({ ...c, open: false }));
    if (acao === "deletar") {
      await fetch(`${API}/cofre/${id}`, { method: "DELETE", headers: h() });
      carregar();
    } else if (acao === "rollback") {
      await fetch(`${API}/cofre/${id}/rollback`, { method: "POST", headers: h() });
      carregar();
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <ShieldCheck size={24} className="text-red-500" /> Cofre de Senhas
            </h2>
            <p className="text-neutral-500 text-sm mt-1">Credenciais das seguradoras — armazenadas com criptografia AES</p>
          </div>
          <button onClick={() => { setShowForm(true); setForm(emptyForm); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0">
            <Plus size={16} /> Nova Credencial
          </button>
        </div>

        {/* Busca */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por seguradora, login ou observação..."
            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-10 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-400 text-sm focus:outline-none focus:border-red-500 transition-colors"
          />
          {busca && (
            <button
              onClick={() => setBusca("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Nova senha gerada */}
        {novaSenhaGerada && (
          <div className="mb-6 bg-emerald-900/30 border border-emerald-700 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-emerald-300 font-semibold mb-1">✓ Nova senha gerada para {novaSenhaGerada.nome}</p>
                <p className="text-xs text-emerald-400 mb-3">Copie a senha antes de fechar. Use no Robô 2 (SUHAI) e depois dispare o Robô 3 (Quiver).</p>
                <code className="bg-neutral-900 text-emerald-300 px-4 py-2 rounded-lg text-sm font-mono border border-emerald-800 block w-fit">
                  {novaSenhaGerada.senha}
                </code>
              </div>
              <button onClick={() => setNovaSenhaGerada(null)} className="text-neutral-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Painel de rotação completa */}
        {rotacaoCompleta && (
          <div className={`mb-6 rounded-xl p-5 border ${
            rotacaoCompleta.status === "sucesso" ? "bg-emerald-900/30 border-emerald-700" :
            rotacaoCompleta.status === "erro"    ? "bg-red-900/30 border-red-800" :
                                                   "bg-blue-900/20 border-blue-800"
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {rotacaoCompleta.status === "rodando"  && <RefreshCw size={20} className="text-blue-400 animate-spin mt-0.5" />}
                {rotacaoCompleta.status === "sucesso"  && <CheckCircle size={20} className="text-emerald-400 mt-0.5" />}
                {rotacaoCompleta.status === "erro"     && <XCircle size={20} className="text-red-400 mt-0.5" />}
                <div>
                  <p className="font-semibold text-white">Rotação Completa — {rotacaoCompleta.nome}</p>
                  <p className="text-sm text-neutral-400 mt-1">{rotacaoCompleta.etapa}</p>
                  {rotacaoCompleta.status === "rodando" && (
                    <div className="flex gap-4 mt-3 text-xs text-neutral-500">
                      <span>EX-{String(rotacaoCompleta.ex2).padStart(4,"0")} Robô 2</span>
                      <span>EX-{String(rotacaoCompleta.ex3).padStart(4,"0")} Robô 3</span>
                      <a href="/logs" className="text-blue-400 hover:underline">Ver Logs →</a>
                    </div>
                  )}
                </div>
              </div>
              {rotacaoCompleta.status !== "rodando" && (
                <button onClick={() => setRotacaoCompleta(null)} className="text-neutral-500 hover:text-white"><X size={16} /></button>
              )}
            </div>
          </div>
        )}

        {/* Formulário */}
        {showForm && (
          <div className="mb-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-5">Nova Credencial</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-neutral-500 mb-1.5 block">Seguradora *</label>
                <input value={form.seguradora_nome} onChange={e => setForm(f => ({ ...f, seguradora_nome: e.target.value.toUpperCase() }))}
                  placeholder="SUHAI"
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1.5 block">Login</label>
                <input value={form.login} onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
                  placeholder="suhai3148"
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1.5 block">Senha atual *</label>
                <input type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1.5 block">URL do portal</label>
                <input value={form.url_portal} onChange={e => setForm(f => ({ ...f, url_portal: e.target.value }))}
                  placeholder="https://i4pro.suhaiseguradora.com.br/"
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-neutral-500 mb-1.5 block">Observação</label>
                <input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                  placeholder="Ex: conta principal da corretora"
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={salvar} disabled={salvando || !form.seguradora_nome || !form.senha}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
                <Save size={15} /> {salvando ? "Salvando..." : "Salvar"}
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 px-5 py-2.5 rounded-lg text-sm font-medium">
                <X size={15} /> Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Grid 3 colunas */}
        {loading ? <p className="text-neutral-500 text-sm">Carregando...</p> : (
          <>
            {(() => {
              const q = busca.toLowerCase().trim();
              const filtrados = q
                ? itens.filter(i =>
                    i.seguradora_nome.toLowerCase().includes(q) ||
                    (i.login ?? "").toLowerCase().includes(q) ||
                    (i.observacao ?? "").toLowerCase().includes(q)
                  )
                : itens;
              return (
                <>
                  {itens.length === 0 && (
                    <div className="text-center py-16 text-neutral-500">
                      <ShieldCheck size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Nenhuma credencial no cofre ainda.</p>
                    </div>
                  )}
                  {itens.length > 0 && filtrados.length === 0 && (
                    <div className="text-center py-16 text-neutral-500">
                      <Search size={36} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Nenhuma seguradora encontrada para <strong className="text-neutral-300">"{busca}"</strong></p>
                      <button onClick={() => setBusca("")} className="text-red-400 hover:underline text-xs mt-2">Limpar busca</button>
                    </div>
                  )}
                  {filtrados.length > 0 && (
                    <>
                      {busca && (
                        <p className="text-xs text-neutral-500 mb-3">
                          {filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""} para <strong className="text-neutral-300">"{busca}"</strong>
                        </p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filtrados.map(item => {
                const ficticia = item.observacao?.toLowerCase().includes("fictíc");
                const emEdicao = editando === item.id;
                return (
                  <div key={item.id} className={`bg-neutral-900 border rounded-xl flex flex-col transition-all ${
                    emEdicao ? "border-red-500/50" : ficticia ? "border-neutral-700" : "border-neutral-800 hover:border-neutral-600"
                  }`}>
                    {/* Header do card */}
                    <div className="p-4 flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${ficticia && !emEdicao ? "bg-neutral-800" : "bg-red-900/30"}`}>
                          <KeyRound size={16} className={ficticia && !emEdicao ? "text-neutral-500" : "text-red-400"} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-semibold text-sm">{item.seguradora_nome}</p>
                          {!emEdicao && item.login && (
                            <p className="text-neutral-500 text-xs mt-0.5">{item.login}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {ficticia && !emEdicao && (
                          <span className="text-xs bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded-full">
                            pendente
                          </span>
                        )}
                        {item.tem_senha_anterior && !emEdicao && (
                          <span className="text-xs bg-yellow-900/50 text-yellow-300 border border-yellow-800 px-2 py-0.5 rounded-full">
                            rotação
                          </span>
                        )}
                        {/* Botão editar / fechar */}
                        {emEdicao ? (
                          <button onClick={() => setEditando(null)}
                            className="text-neutral-500 hover:text-white p-1 rounded transition-colors">
                            <X size={14} />
                          </button>
                        ) : (
                          <button onClick={() => abrirEdicao(item)}
                            title="Editar credencial"
                            className="text-neutral-500 hover:text-white p-1 rounded transition-colors">
                            <Pencil size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Formulário de edição inline */}
                    {emEdicao ? (
                      <div className="px-4 pb-4 space-y-3">
                        <div>
                          <label className="text-xs text-neutral-500 mb-1 block">Login / Usuário</label>
                          <input value={editForm.login} onChange={e => setEditForm(f => ({ ...f, login: e.target.value }))}
                            placeholder="usuário no portal"
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
                        </div>
                        <div>
                          <label className="text-xs text-neutral-500 mb-1 block">Senha *</label>
                          <input type="password" value={editForm.senha} onChange={e => setEditForm(f => ({ ...f, senha: e.target.value }))}
                            placeholder="••••••••"
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
                        </div>
                        <div>
                          <label className="text-xs text-neutral-500 mb-1 block">URL do portal</label>
                          <input value={editForm.url_portal} onChange={e => setEditForm(f => ({ ...f, url_portal: e.target.value }))}
                            placeholder="https://..."
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => salvarEdicao(item)} disabled={salvandoEdit || !editForm.senha}
                            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors flex-1 justify-center">
                            <Save size={12} /> {salvandoEdit ? "Salvando..." : "Salvar credencial"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* URL */}
                        {item.url_portal && (
                          <div className="px-4 pb-3">
                            <a href={item.url_portal} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 truncate">
                              <ExternalLink size={9} /> {item.url_portal.replace(/https?:\/\//, "")}
                            </a>
                          </div>
                        )}

                        {/* Senha visível */}
                        {senhasVisiveis[item.id] && (
                          <div className="mx-4 mb-3 bg-neutral-800 rounded-lg border border-emerald-800/50">
                            <div className="flex items-center gap-2 px-3 py-2">
                              <span className="text-xs text-neutral-500 shrink-0">Senha:</span>
                              <code className="text-emerald-300 font-mono text-sm flex-1 break-all select-all">
                                {senhasVisiveis[item.id]}
                              </code>
                              <button
                                onClick={async () => {
                                  await navigator.clipboard.writeText(senhasVisiveis[item.id] ?? "");
                                  setCopiado(item.id);
                                  setTimeout(() => setCopiado(null), 2000);
                                }}
                                className="text-xs shrink-0 px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 transition-colors text-neutral-300 hover:text-white">
                                {copiado === item.id ? "✓ copiado" : "copiar"}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Ações */}
                        <div className="mt-auto border-t border-neutral-800 p-3 flex flex-wrap gap-1.5">
                          <button onClick={() => verSenha(item.id)}
                            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                              senhasVisiveis[item.id]
                                ? "text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/40"
                                : "text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700"
                            }`}>
                            {loadingSenha === item.id
                              ? <RefreshCw size={10} className="animate-spin" />
                              : senhasVisiveis[item.id] ? <EyeOff size={10} /> : <Eye size={10} />}
                            {senhasVisiveis[item.id] ? "Ocultar" : "Ver senha"}
                          </button>

                          {!ficticia && (
                            <button onClick={() => iniciarRotacaoCompleta(item)}
                              disabled={rotacaoCompleta?.status === "rodando"}
                              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-yellow-300 bg-neutral-800 hover:bg-yellow-900/30 disabled:opacity-40 px-2.5 py-1.5 rounded-lg transition-colors font-medium">
                              <Zap size={10} /> Rotação Auto
                            </button>
                          )}

                          {item.tem_senha_anterior && (
                            <button onClick={() => setConfirmModal({ open: true, id: item.id, acao: "rollback", nome: item.seguradora_nome })}
                              className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-900/20 hover:bg-yellow-900/40 px-2.5 py-1.5 rounded-lg transition-colors">
                              <RotateCcw size={10} /> Rollback
                            </button>
                          )}

                          <button onClick={() => setConfirmModal({ open: true, id: item.id, acao: "deletar", nome: item.seguradora_nome })}
                            className="ml-auto text-neutral-600 hover:text-red-500 transition-colors p-1.5">
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <p className="text-xs text-neutral-700 px-3 pb-2 text-right">
                          {format(new Date(item.atualizado_em || item.criado_em), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </p>
                      </>
                    )}
                  </div>
                );
                        })}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </>
        )}
      </main>

      <ConfirmModal
        open={confirmModal.open}
        titulo={confirmModal.acao === "deletar" ? "Excluir credencial" : "Restaurar senha anterior"}
        descricao={confirmModal.acao === "deletar"
          ? `Excluir permanentemente a credencial de ${confirmModal.nome}?`
          : `Restaurar a senha anterior de ${confirmModal.nome}? A senha atual será perdida.`}
        confirmLabel={confirmModal.acao === "deletar" ? "Excluir" : "Restaurar"}
        variante="danger"
        onConfirm={confirmarAcao}
        onCancel={() => setConfirmModal(c => ({ ...c, open: false }))}
      />
    </div>
  );
}
