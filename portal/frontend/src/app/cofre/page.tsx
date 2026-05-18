"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import ConfirmModal from "@/components/ConfirmModal";
import {
  Lock, Plus, Search, X, Eye, EyeOff, Copy, Check,
  ExternalLink, Pencil, Trash2, RefreshCw, ChevronDown,
  ShieldCheck, Monitor, Building2, CreditCard, Mail, KeyRound,
  Tag, Save, Zap, History, Upload, AlertTriangle, CheckCircle, XCircle,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CampoOut {
  label: string; valor: string | null; tipo: string; oculto: boolean; purpose: string | null;
}
interface CofreItemOut {
  id: number; categoria: string; categoria_id: number | null;
  nome: string; url: string | null;
  tags: string[]; notas: string | null; campos: CampoOut[];
  robo_vinculo: number | null; tem_historico: boolean;
  criado_em: string; atualizado_em: string | null;
}
interface CampoForm {
  label: string; valor: string; tipo: string; oculto: boolean; purpose: string;
}
interface ItemForm {
  categoria: string; categoria_id: number | null;
  nome: string; url: string; tags: string[];
  notas: string; campos: CampoForm[]; robo_vinculo: string;
}

interface Categoria {
  id: number; nome: string; slug: string; icone: string | null; cor: string | null;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CATS = [
  { id: "todas", label: "Todas" },
  { id: "seguradora", label: "Seguradora" },
  { id: "sistema", label: "Sistema" },
  { id: "cliente", label: "Cliente" },
  { id: "banco", label: "Banco" },
  { id: "email", label: "E-mail" },
  { id: "outro", label: "Outro" },
];

const CAT_ICON: Record<string, any> = {
  seguradora: ShieldCheck, sistema: Monitor, cliente: Building2,
  banco: CreditCard, email: Mail, outro: KeyRound,
};

const CAT_COLOR: Record<string, string> = {
  seguradora: "bg-red-900/30 text-red-400 border border-red-800/50",
  sistema:    "bg-blue-900/30 text-blue-400 border border-blue-800/50",
  cliente:    "bg-purple-900/30 text-purple-400 border border-purple-800/50",
  banco:      "bg-green-900/30 text-green-400 border border-green-800/50",
  email:      "bg-yellow-900/30 text-yellow-400 border border-yellow-800/50",
  outro:      "bg-neutral-800 text-neutral-400 border border-neutral-700",
};

const emptyForm = (): ItemForm => ({
  categoria: "outro", categoria_id: null,
  nome: "", url: "", tags: [], notas: "", robo_vinculo: "",
  campos: [
    { label: "Login", valor: "", tipo: "text", oculto: false, purpose: "LOGIN" },
    { label: "Senha", valor: "", tipo: "password", oculto: true, purpose: "PASSWORD" },
  ],
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CofrePage() {
  const [itens, setItens]         = useState<CofreItemOut[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading]     = useState(true);
  const [catId, setCatId]         = useState<number | "todas">("todas");
  const [busca, setBusca]         = useState("");

  const [drawer, setDrawer]       = useState(false);
  const [editando, setEditando]   = useState<CofreItemOut | null>(null);
  const [form, setForm]           = useState<ItemForm>(emptyForm());
  const [tagInput, setTagInput]   = useState("");
  const [salvando, setSalvando]   = useState(false);

  const [revelados, setRevelados] = useState<Record<string, string>>({});
  const [revelando, setRevelando] = useState<string | null>(null);
  const [copiado, setCopiado]     = useState<string | null>(null);
  const [expandido, setExpandido] = useState<number | null>(null);

  const [sincronizando, setSincronizando] = useState<{
    id: number; nome: string; ex: number;
    status: "rodando" | "sucesso" | "erro"; etapa: string;
  } | null>(null);

  const [importJson, setImportJson]     = useState(false);
  const [importText, setImportText]     = useState("");
  const [importResult, setImportResult] = useState<{ criados: number; erros: any[] } | null>(null);
  const [importando, setImportando]     = useState(false);

  const [confirmDel, setConfirmDel] = useState<{ open: boolean; id: number; nome: string }>
    ({ open: false, id: 0, nome: "" });

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const { apiFetch } = await import("@/lib/auth");
    return apiFetch(`${API}${path}`, init);
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [rItens, rCats] = await Promise.all([
      (async () => {
        const p = new URLSearchParams();
        if (catId !== "todas") p.set("categoria_id", String(catId));
        if (busca) p.set("q", busca);
        return api(`/cofre-itens/?${p}`);
      })(),
      api("/categorias/"),
    ]);
    setItens(rItens.ok ? await rItens.json() : []);
    setCategorias(rCats.ok ? await rCats.json() : []);
    setLoading(false);
  }, [catId, busca, api]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Revelar ────────────────────────────────────────────────────────────────

  const revelar = async (itemId: number, idx: number) => {
    const key = `${itemId}_${idx}`;
    if (revelados[key]) {
      setRevelados(r => { const n = { ...r }; delete n[key]; return n; });
      return;
    }
    setRevelando(key);
    const res = await api(`/cofre-itens/${itemId}/campos/${idx}/revelar`, { method: "POST" });
    if (res.ok) { const d = await res.json(); setRevelados(r => ({ ...r, [key]: d.valor })); }
    setRevelando(null);
  };

  const copiar = async (key: string, valor: string) => {
    await navigator.clipboard.writeText(valor);
    setCopiado(key); setTimeout(() => setCopiado(null), 2000);
  };

  // ── Drawer ─────────────────────────────────────────────────────────────────

  const abrirCriar = () => {
    setEditando(null); setForm(emptyForm()); setTagInput(""); setDrawer(true);
  };

  const abrirEditar = (item: CofreItemOut) => {
    setEditando(item);
    setForm({
      categoria: item.categoria, categoria_id: item.categoria_id ?? null,
      nome: item.nome, url: item.url ?? "",
      tags: item.tags, notas: item.notas ?? "",
      robo_vinculo: item.robo_vinculo?.toString() ?? "",
      campos: item.campos.map(c => ({
        label: c.label, valor: c.oculto ? "" : (c.valor ?? ""),
        tipo: c.tipo, oculto: c.oculto, purpose: c.purpose ?? "",
      })),
    });
    setTagInput(""); setDrawer(true);
  };

  const addCampo = () => setForm(f => ({
    ...f, campos: [...f.campos, { label: "", valor: "", tipo: "text", oculto: false, purpose: "" }]
  }));

  const setCampo = (i: number, patch: Partial<CampoForm>) =>
    setForm(f => ({ ...f, campos: f.campos.map((c, j) => j === i ? { ...c, ...patch } : c) }));

  const rmCampo = (i: number) =>
    setForm(f => ({ ...f, campos: f.campos.filter((_, j) => j !== i) }));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  };

  const salvar = async () => {
    if (!form.nome.trim()) return;
    setSalvando(true);
    const path   = editando ? `/cofre-itens/${editando.id}` : "/cofre-itens/";
    const method = editando ? "PUT" : "POST";
    const body   = {
      ...form,
      campos: form.campos.filter(c => c.label),
      robo_vinculo: form.robo_vinculo ? parseInt(form.robo_vinculo) : null,
    };
    const res = await api(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSalvando(false);
    if (res.ok) { setDrawer(false); setRevelados({}); carregar(); }
    else { const e = await res.json(); alert(e.detail || "Erro ao salvar"); }
  };

  const deletar = async () => {
    await api(`/cofre-itens/${confirmDel.id}`, { method: "DELETE" });
    setConfirmDel(c => ({ ...c, open: false })); carregar();
  };

  // ── Sincronizar com Quiver ─────────────────────────────────────────────────

  const sincronizarQuiver = async (item: CofreItemOut) => {
    if (!confirm(`Sincronizar a senha de "${item.nome}" no Quiver?\n\nÉ usada a senha que está agora no cofre.\nUse essa opção depois de atualizar a senha aqui no cofre.`)) return;
    const res = await api(`/cofre-itens/${item.id}/sincronizar-quiver`, { method: "POST" });
    if (!res.ok) { const e = await res.json(); alert(e.detail || "Erro ao sincronizar"); return; }
    const d = await res.json();
    setSincronizando({ id: item.id, nome: item.nome, ex: d.execucao_robo3_id,
                       status: "rodando", etapa: "Robô 3 — Atualizando senha no Quiver..." });

    const poll = async () => {
      for (let t = 0; t < 80; t++) {
        await new Promise(r => setTimeout(r, 8000));
        const r = await api(`/execucoes/?limit=50`);
        if (!r.ok) continue;
        const execs: any[] = await r.json();
        const ex = execs.find(e => e.id === d.execucao_robo3_id);
        if (ex?.status === "erro") {
          setSincronizando(rc => rc ? ({ ...rc, status: "erro", etapa: `Falhou: ${ex.mensagem}` }) : rc);
          carregar(); return;
        }
        if (ex?.status === "sucesso") {
          setSincronizando(rc => rc ? ({ ...rc, status: "sucesso", etapa: "Senha sincronizada no Quiver com sucesso!" }) : rc);
          carregar(); return;
        }
      }
      setSincronizando(rc => rc ? ({ ...rc, status: "erro", etapa: "Timeout — verifique os Logs." }) : rc);
    };
    poll();
  };

  // ── Import JSON ────────────────────────────────────────────────────────────

  const runImport = async () => {
    setImportando(true); setImportResult(null);
    try {
      const itensJson = JSON.parse(importText);
      const res = await api(`/cofre-itens/importar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens: Array.isArray(itensJson) ? itensJson : [itensJson] }),
      });
      const d = await res.json();
      setImportResult(d); carregar();
    } catch (e: any) {
      alert("JSON inválido: " + e.message);
    }
    setImportando(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-h-screen bg-neutral-50 dark:bg-neutral-950 p-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Lock size={22} className="text-red-500" /> Cofre de Senhas
            </h2>
            <p className="text-neutral-500 text-sm mt-1">Credenciais com criptografia por campo · Sincronização com Quiver</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setImportJson(v => !v)}
              className="flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 text-neutral-700 dark:text-neutral-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
              <Upload size={15} /> Importar
            </button>
            <button onClick={abrirCriar}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus size={16} /> Novo Item
            </button>
          </div>
        </div>

        {/* Painel sincronização */}
        {sincronizando && (
          <div className={`mb-6 rounded-xl p-5 border flex items-start justify-between gap-4 ${
            sincronizando.status === "sucesso" ? "bg-emerald-900/20 border-emerald-700" :
            sincronizando.status === "erro"    ? "bg-red-900/20 border-red-800" :
                                                  "bg-blue-900/10 border-blue-800"
          }`}>
            <div className="flex items-start gap-3">
              {sincronizando.status === "rodando" && <RefreshCw size={18} className="text-blue-400 animate-spin mt-0.5 shrink-0" />}
              {sincronizando.status === "sucesso" && <CheckCircle size={18} className="text-emerald-400 mt-0.5 shrink-0" />}
              {sincronizando.status === "erro"    && <XCircle size={18} className="text-red-400 mt-0.5 shrink-0" />}
              <div>
                <p className="font-semibold text-white text-sm">Sincronizar Quiver — {sincronizando.nome}</p>
                <p className="text-neutral-400 text-xs mt-1">{sincronizando.etapa}</p>
                {sincronizando.status === "rodando" && (
                  <div className="flex gap-4 mt-2 text-xs text-neutral-500">
                    <span>EX-{String(sincronizando.ex).padStart(4,"0")} Robô 3</span>
                    <a href="/logs" className="text-blue-400 hover:underline">Ver Logs →</a>
                  </div>
                )}
              </div>
            </div>
            {sincronizando.status !== "rodando" && (
              <button onClick={() => setSincronizando(null)} className="text-neutral-500 hover:text-white shrink-0"><X size={16} /></button>
            )}
          </div>
        )}

        {/* Painel import */}
        {importJson && (
          <div className="mb-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-neutral-900 dark:text-white text-sm">Importar JSON</h3>
              <button onClick={() => { setImportJson(false); setImportResult(null); setImportText(""); }}>
                <X size={16} className="text-neutral-400" />
              </button>
            </div>
            <p className="text-xs text-neutral-500 mb-3">
              Cole um array JSON de itens. Formato: <code className="text-neutral-300">{"[{categoria, nome, url, tags, notas, campos: [{label, valor, tipo, oculto, purpose}]}]"}</code>
            </p>
            <textarea value={importText} onChange={e => setImportText(e.target.value)}
              rows={6} placeholder='[{"categoria":"seguradora","nome":"GNDI","campos":[{"label":"Login","valor":"debora@harper.com","tipo":"email","oculto":false},{"label":"Senha","valor":"Harper@24","tipo":"password","oculto":true,"purpose":"PASSWORD"}]}]'
              className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white text-xs font-mono focus:outline-none" />
            {importResult && (
              <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${importResult.erros.length ? "bg-yellow-900/20 text-yellow-300" : "bg-emerald-900/20 text-emerald-300"}`}>
                ✓ {importResult.criados} itens criados.
                {importResult.erros.length > 0 && ` ${importResult.erros.length} erro(s): ${importResult.erros.map(e => e.nome).join(", ")}`}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button onClick={runImport} disabled={importando || !importText.trim()}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium">
                {importando ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                {importando ? "Importando..." : "Importar"}
              </button>
            </div>
          </div>
        )}

        {/* Filtros — dinâmicos pelo backend */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setCatId("todas")}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
              catId === "todas"
                ? "bg-red-600 border-red-500 text-white"
                : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400"
            }`}>
            Todas
          </button>
          {categorias.map(c => (
            <button key={c.id} onClick={() => setCatId(c.id)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                catId === c.id
                  ? "bg-red-600 border-red-500 text-white"
                  : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400"
              }`}>
              {c.nome}
            </button>
          ))}
        </div>

        {/* Busca */}
        <div className="relative mb-6">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, tag, login..."
            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-10 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-400 text-sm focus:outline-none focus:border-red-500" />
          {busca && <button onClick={() => setBusca("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"><X size={14} /></button>}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center gap-3 text-neutral-500 text-sm"><RefreshCw size={16} className="animate-spin" /> Carregando...</div>
        ) : itens.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <Lock size={40} className="text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm font-medium">{busca ? `Nenhum resultado para "${busca}"` : "Nenhum item no cofre"}</p>
            {!busca && <button onClick={abrirCriar} className="text-red-400 hover:underline text-xs mt-2">Criar primeiro item</button>}
          </div>
        ) : (
          <>
            {busca && <p className="text-xs text-neutral-500 mb-3">{itens.length} resultado{itens.length !== 1 ? "s" : ""} para <strong className="text-neutral-300">"{busca}"</strong></p>}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {itens.map(item => {
                const Icon  = CAT_ICON[item.categoria] ?? KeyRound;
                const aberto = expandido === item.id;
                return (
                  <div key={item.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-xl flex flex-col transition-all">

                    {/* Card header */}
                    <div className="p-4 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 ${CAT_COLOR[item.categoria] ?? CAT_COLOR.outro}`}>
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-neutral-900 dark:text-white font-semibold text-sm truncate">{item.nome}</p>
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5 truncate mt-0.5">
                              <ExternalLink size={9} />{item.url.replace(/https?:\/\//, "").slice(0, 35)}
                            </a>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium capitalize ${CAT_COLOR[item.categoria] ?? CAT_COLOR.outro}`}>
                        {item.categoria}
                      </span>
                    </div>

                    {/* Tags */}
                    {item.tags.length > 0 && (
                      <div className="px-4 pb-2 flex flex-wrap gap-1">
                        {item.tags.map(t => (
                          <span key={t} className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    )}

                    {/* Campos colapsáveis */}
                    <div className="px-4 pb-2">
                      <button onClick={() => setExpandido(aberto ? null : item.id)}
                        className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors mb-1.5">
                        <ChevronDown size={13} className={`transition-transform ${aberto ? "rotate-180" : ""}`} />
                        {item.campos.length} campo{item.campos.length !== 1 ? "s" : ""}
                      </button>

                      {aberto && (
                        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-2 space-y-0.5">
                          {item.campos.map((campo, idx) => {
                            const key    = `${item.id}_${idx}`;
                            const vis    = campo.oculto ? revelados[key] : campo.valor;
                            const isUrl  = campo.tipo === "url";
                            return (
                              <div key={idx} className="flex items-center gap-2 py-1 group">
                                <span className="text-xs text-neutral-500 w-20 shrink-0 truncate">{campo.label}</span>
                                <div className="flex-1 min-w-0">
                                  {campo.oculto && !vis ? (
                                    <span className="text-sm text-neutral-600 font-mono tracking-widest">••••••••</span>
                                  ) : isUrl && vis ? (
                                    <a href={vis} target="_blank" rel="noopener noreferrer"
                                      className="text-xs text-blue-400 hover:underline flex items-center gap-0.5 truncate">
                                      <ExternalLink size={9} />{vis.replace(/https?:\/\//, "").slice(0, 35)}
                                    </a>
                                  ) : (
                                    <span className="text-sm text-neutral-200 font-mono truncate block">{vis || <span className="text-neutral-600 italic text-xs">—</span>}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {campo.oculto && (
                                    <button onClick={() => revelar(item.id, idx)} disabled={revelando === key}
                                      className="p-1 text-neutral-500 hover:text-white">
                                      {revelando === key ? <RefreshCw size={11} className="animate-spin" /> : vis ? <EyeOff size={11} /> : <Eye size={11} />}
                                    </button>
                                  )}
                                  {vis && (
                                    <button onClick={() => copiar(key, vis!)} className="p-1 text-neutral-500 hover:text-white">
                                      {copiado === key ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {item.notas && (
                            <div className="mt-2 text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg px-3 py-2 italic">
                              {item.notas}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="mt-auto border-t border-neutral-100 dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {item.robo_vinculo && (
                          <button
                            onClick={() => sincronizarQuiver(item)}
                            disabled={sincronizando?.status === "rodando"}
                            title="Atualiza a senha no Quiver usando a senha do cofre"
                            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-blue-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-900/20 disabled:opacity-40 px-2.5 py-1.5 rounded-lg transition-colors font-medium">
                            <Zap size={11} /> Sincronizar Quiver
                          </button>
                        )}
                        {item.tem_historico && (
                          <span title="Tem histórico de senhas" className="p-1.5 text-yellow-600">
                            <History size={12} />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => abrirEditar(item)}
                          className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setConfirmDel({ open: true, id: item.id, nome: item.nome })}
                          className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-900/10 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* ── Drawer ───────────────────────────────────────────────────────────── */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setDrawer(false)} />
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">

            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                {editando ? `Editar — ${editando.nome}` : "Novo Item"}
              </h3>
              <button onClick={() => setDrawer(false)} className="text-neutral-400 hover:text-white p-1"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Nome + Categoria */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-neutral-500 mb-1.5 block font-medium uppercase tracking-wide">Nome *</label>
                  <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: GNDI — Cotação PME"
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1.5 block font-medium uppercase tracking-wide">Categoria</label>
                  <select value={form.categoria_id ?? ""} onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value ? parseInt(e.target.value) : null }))}
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-red-500">
                    <option value="">— sem categoria —</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1.5 block font-medium uppercase tracking-wide">Robô vinculado</label>
                  <select value={form.robo_vinculo} onChange={e => setForm(f => ({ ...f, robo_vinculo: e.target.value }))}
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-red-500">
                    <option value="">Nenhum</option>
                    <option value="2">Robô 2 — SUHAI</option>
                  </select>
                </div>
              </div>

              {/* URL */}
              <div>
                <label className="text-xs text-neutral-500 mb-1.5 block font-medium uppercase tracking-wide">URL</label>
                <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-red-500" />
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs text-neutral-500 mb-1.5 block font-medium uppercase tracking-wide">Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.tags.map(t => (
                    <span key={t} className="flex items-center gap-1 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-2 py-1 rounded-full border border-neutral-200 dark:border-neutral-700">
                      <Tag size={9} />{t}
                      <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))} className="text-neutral-400 hover:text-red-400 ml-0.5"><X size={9} /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                    placeholder="tag + Enter"
                    className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-red-500" />
                  <button onClick={addTag} className="px-3 py-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors">+ Add</button>
                </div>
              </div>

              {/* Campos dinâmicos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Campos</label>
                  <button onClick={addCampo} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                    <Plus size={12} /> Adicionar campo
                  </button>
                </div>
                <div className="space-y-4">
                  {form.campos.map((campo, i) => {
                    const isSenha = campo.oculto || campo.purpose === "PASSWORD";
                    return (
                    <div key={i} className={`rounded-xl p-3 space-y-3 border ${
                      isSenha
                        ? "bg-red-950/20 border-red-900/40"
                        : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                    }`}>
                      {/* Header com label + ações */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">
                          Campo #{i + 1}
                          {campo.purpose === "LOGIN" && <span className="ml-2 text-blue-400 normal-case tracking-normal">— Usuário do robô</span>}
                          {campo.purpose === "PASSWORD" && <span className="ml-2 text-red-400 normal-case tracking-normal">— Senha do robô</span>}
                        </span>
                        <button onClick={() => rmCampo(i)} title="Remover campo"
                          className="text-neutral-400 hover:text-red-400 p-1 transition-colors">
                          <X size={13} />
                        </button>
                      </div>

                      {/* Nome do campo */}
                      <div>
                        <label className="text-[10px] text-neutral-500 uppercase tracking-wide mb-1 block">
                          Nome do campo (texto que aparece à esquerda no cofre)
                        </label>
                        <input value={campo.label} onChange={e => setCampo(i, { label: e.target.value })}
                          placeholder="Ex: Usuário, Senha, Login, CNPJ..."
                          className="w-full bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-red-500" />
                      </div>

                      {/* Valor */}
                      <div>
                        <label className="text-[10px] uppercase tracking-wide mb-1 block font-semibold flex items-center gap-1">
                          {isSenha ? (
                            <><Lock size={9} className="text-red-400" /><span className="text-red-400">Senha (criptografada)</span></>
                          ) : (
                            <span className="text-neutral-500">Valor</span>
                          )}
                        </label>
                        <input
                          type={campo.oculto ? "password" : "text"}
                          value={campo.valor}
                          onChange={e => setCampo(i, { valor: e.target.value })}
                          placeholder={campo.oculto && editando ? "Deixe vazio para manter a senha atual" : (isSenha ? "Digite a senha aqui" : "Digite o valor aqui")}
                          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none font-mono ${
                            isSenha
                              ? "bg-neutral-900 border-red-900/50 text-red-100 focus:border-red-500 placeholder-red-900/60"
                              : "bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-white focus:border-red-500"
                          }`} />
                      </div>

                      {/* Configurações compactas */}
                      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-neutral-200/50 dark:border-neutral-700/50">
                        <select value={campo.tipo} onChange={e => setCampo(i, { tipo: e.target.value })}
                          title="Tipo de campo"
                          className="bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg px-2 py-1 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none">
                          {["text","password","email","url"].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select value={campo.purpose} onChange={e => setCampo(i, { purpose: e.target.value })}
                          title="Função para os robôs"
                          className="bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg px-2 py-1 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none">
                          <option value="">Sem função</option>
                          <option value="LOGIN">LOGIN (usuário)</option>
                          <option value="PASSWORD">PASSWORD (senha)</option>
                        </select>
                        <label className="flex items-center gap-1.5 text-xs text-neutral-500 cursor-pointer ml-auto">
                          <input type="checkbox" checked={campo.oculto}
                            onChange={e => setCampo(i, { oculto: e.target.checked, tipo: e.target.checked ? "password" : campo.tipo })}
                            className="rounded" />
                          <Lock size={10} /> Criptografar
                        </label>
                      </div>
                    </div>
                  );})}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="text-xs text-neutral-500 mb-1.5 block font-medium uppercase tracking-wide">Notas</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Observações, instruções de uso, contatos..." rows={3}
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-red-500" />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 flex gap-3">
              <button onClick={salvar} disabled={salvando || !form.nome.trim()}
                className="flex items-center gap-2 flex-1 justify-center bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                <Save size={15} /> {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar item"}
              </button>
              <button onClick={() => setDrawer(false)}
                className="px-5 py-2.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-sm font-medium hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDel.open}
        titulo="Excluir item"
        descricao={`Excluir "${confirmDel.nome}" permanentemente? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variante="danger"
        onConfirm={deletar}
        onCancel={() => setConfirmDel(c => ({ ...c, open: false }))}
      />
    </div>
  );
}
