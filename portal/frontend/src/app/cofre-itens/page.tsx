"use client";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import ConfirmModal from "@/components/ConfirmModal";
import {
  Lock, Plus, Search, X, Eye, EyeOff, Copy, Check,
  ExternalLink, Pencil, Trash2, RefreshCw, ChevronDown,
  ShieldCheck, Monitor, Building2, CreditCard, Mail, KeyRound,
  Tag, Save, RotateCcw, History,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CampoOut {
  label: string;
  valor: string | null;
  tipo: string;
  oculto: boolean;
}

interface CofreItemOut {
  id: number;
  categoria: string;
  nome: string;
  url: string | null;
  tags: string[];
  notas: string | null;
  campos: CampoOut[];
  tem_historico: boolean;
  criado_em: string;
  atualizado_em: string | null;
}

interface CampoForm {
  label: string;
  valor: string;
  tipo: string;
  oculto: boolean;
}

interface ItemForm {
  categoria: string;
  nome: string;
  url: string;
  tags: string[];
  notas: string;
  campos: CampoForm[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { id: "todas",      label: "Todas" },
  { id: "seguradora", label: "Seguradora" },
  { id: "sistema",    label: "Sistema" },
  { id: "cliente",    label: "Cliente" },
  { id: "banco",      label: "Banco" },
  { id: "email",      label: "E-mail" },
  { id: "outro",      label: "Outro" },
];

const CAT_ICON: Record<string, any> = {
  seguradora: ShieldCheck,
  sistema:    Monitor,
  cliente:    Building2,
  banco:      CreditCard,
  email:      Mail,
  outro:      KeyRound,
};

const CAT_COLOR: Record<string, string> = {
  seguradora: "bg-red-900/30 text-red-400 border-red-800/50",
  sistema:    "bg-blue-900/30 text-blue-400 border-blue-800/50",
  cliente:    "bg-purple-900/30 text-purple-400 border-purple-800/50",
  banco:      "bg-green-900/30 text-green-400 border-green-800/50",
  email:      "bg-yellow-900/30 text-yellow-400 border-yellow-800/50",
  outro:      "bg-neutral-800 text-neutral-400 border-neutral-700",
};

const TIPOS_CAMPO = ["text", "password", "email", "url"];

const emptyForm = (): ItemForm => ({
  categoria: "outro", nome: "", url: "", tags: [], notas: "",
  campos: [{ label: "Login", valor: "", tipo: "text", oculto: false },
           { label: "Senha", valor: "", tipo: "password", oculto: true }],
});

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function CatBadge({ cat }: { cat: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${CAT_COLOR[cat] ?? CAT_COLOR.outro}`}>
      {cat}
    </span>
  );
}

function CampoRow({
  campo, index, itemId, revelado, revelando, copiado,
  onRevelar, onCopiar,
}: {
  campo: CampoOut; index: number; itemId: number;
  revelado?: string; revelando: boolean; copiado: boolean;
  onRevelar: () => void; onCopiar: (v: string) => void;
}) {
  const valorVis = campo.oculto ? (revelado ?? null) : campo.valor;
  const isUrl = campo.tipo === "url";
  const isEmail = campo.tipo === "email";

  return (
    <div className="flex items-center gap-2 py-1.5 group">
      <span className="text-xs text-neutral-500 w-20 shrink-0 truncate">{campo.label}</span>
      <div className="flex-1 min-w-0">
        {campo.oculto && !revelado ? (
          <span className="text-sm text-neutral-600 font-mono tracking-widest">••••••••</span>
        ) : isUrl && valorVis ? (
          <a href={valorVis} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 truncate">
            <ExternalLink size={10} /> {valorVis.replace(/https?:\/\//, "").slice(0, 40)}
          </a>
        ) : (
          <span className={`text-sm text-neutral-200 font-mono truncate block ${campo.oculto ? "select-all" : ""}`}>
            {valorVis || <span className="text-neutral-600 italic text-xs">vazio</span>}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {campo.oculto && (
          <button onClick={onRevelar} disabled={revelando}
            className="p-1 text-neutral-500 hover:text-white transition-colors">
            {revelando ? <RefreshCw size={12} className="animate-spin" /> :
              revelado ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        )}
        {valorVis && (
          <button onClick={() => onCopiar(valorVis!)}
            className="p-1 text-neutral-500 hover:text-white transition-colors">
            {copiado ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CofreItensPage() {
  const [itens, setItens]           = useState<CofreItemOut[]>([]);
  const [loading, setLoading]       = useState(true);
  const [categoria, setCategoria]   = useState("todas");
  const [busca, setBusca]           = useState("");

  // Drawer criar/editar
  const [drawer, setDrawer]         = useState(false);
  const [editando, setEditando]     = useState<CofreItemOut | null>(null);
  const [form, setForm]             = useState<ItemForm>(emptyForm());
  const [tagInput, setTagInput]     = useState("");
  const [salvando, setSalvando]     = useState(false);

  // Revelar/copiar
  const [revelados, setRevelados]   = useState<Record<string, string>>({});   // `${id}_${idx}`
  const [revelando, setRevelando]   = useState<string | null>(null);
  const [copiado, setCopiado]       = useState<string | null>(null);

  // Expandir card
  const [expandido, setExpandido]   = useState<number | null>(null);

  // Confirm delete
  const [confirmDel, setConfirmDel] = useState<{ open: boolean; id: number; nome: string }>
    ({ open: false, id: 0, nome: "" });

  const h = useCallback(async () => {
    const { authHeader } = await import("@/lib/auth");
    return authHeader();
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    const headers = await h();
    const params = new URLSearchParams();
    if (categoria !== "todas") params.set("categoria", categoria);
    if (busca) params.set("q", busca);
    const res = await fetch(`${API}/cofre-itens/?${params}`, { headers });
    const data = res.ok ? await res.json() : [];
    setItens(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [categoria, busca, h]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Revelar campo ──────────────────────────────────────────────────────────

  const revelar = async (itemId: number, idx: number) => {
    const key = `${itemId}_${idx}`;
    if (revelados[key]) { setRevelados(r => { const n = { ...r }; delete n[key]; return n; }); return; }
    setRevelando(key);
    const headers = await h();
    const res = await fetch(`${API}/cofre-itens/${itemId}/campos/${idx}/revelar`, { method: "POST", headers });
    if (res.ok) {
      const d = await res.json();
      setRevelados(r => ({ ...r, [key]: d.valor }));
    }
    setRevelando(null);
  };

  // ── Copiar ─────────────────────────────────────────────────────────────────

  const copiar = async (key: string, valor: string) => {
    await navigator.clipboard.writeText(valor);
    setCopiado(key);
    setTimeout(() => setCopiado(null), 2000);
  };

  // ── Drawer helpers ─────────────────────────────────────────────────────────

  const abrirCriar = () => {
    setEditando(null);
    setForm(emptyForm());
    setTagInput("");
    setDrawer(true);
  };

  const abrirEditar = (item: CofreItemOut) => {
    setEditando(item);
    setForm({
      categoria: item.categoria,
      nome: item.nome,
      url: item.url ?? "",
      tags: item.tags,
      notas: item.notas ?? "",
      campos: item.campos.map(c => ({
        label: c.label,
        valor: c.oculto ? "" : (c.valor ?? ""),
        tipo: c.tipo,
        oculto: c.oculto,
      })),
    });
    setTagInput("");
    setDrawer(true);
  };

  const addCampo = () => setForm(f => ({ ...f, campos: [...f.campos, { label: "", valor: "", tipo: "text", oculto: false }] }));
  const removeCampo = (i: number) => setForm(f => ({ ...f, campos: f.campos.filter((_, j) => j !== i) }));
  const setCampo = (i: number, patch: Partial<CampoForm>) =>
    setForm(f => ({ ...f, campos: f.campos.map((c, j) => j === i ? { ...c, ...patch } : c) }));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  };

  const salvar = async () => {
    if (!form.nome.trim()) return;
    setSalvando(true);
    const headers = await h();
    const url = editando ? `${API}/cofre-itens/${editando.id}` : `${API}/cofre-itens/`;
    const method = editando ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, campos: form.campos.filter(c => c.label) }),
    });
    setSalvando(false);
    if (res.ok) { setDrawer(false); setRevelados({}); carregar(); }
    else { const e = await res.json(); alert(e.detail || "Erro ao salvar"); }
  };

  const deletar = async () => {
    const headers = await h();
    await fetch(`${API}/cofre-itens/${confirmDel.id}`, { method: "DELETE", headers });
    setConfirmDel(c => ({ ...c, open: false }));
    carregar();
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
              <Lock size={22} className="text-red-500" /> Cofre Pro
            </h2>
            <p className="text-neutral-500 text-sm mt-1">
              Credenciais com campos dinâmicos — criptografia por campo sensível
            </p>
          </div>
          <button onClick={abrirCriar}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0">
            <Plus size={16} /> Novo Item
          </button>
        </div>

        {/* Filtros de categoria */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {CATEGORIAS.map(c => (
            <button key={c.id} onClick={() => setCategoria(c.id)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-all ${
                categoria === c.id
                  ? "bg-red-600 border-red-500 text-white"
                  : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400"
              }`}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Busca */}
        <div className="relative mb-6">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, tag ou conteúdo..."
            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-10 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-400 text-sm focus:outline-none focus:border-red-500" />
          {busca && (
            <button onClick={() => setBusca("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center gap-3 text-neutral-500 text-sm">
            <RefreshCw size={16} className="animate-spin" /> Carregando...
          </div>
        ) : itens.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <Lock size={40} className="text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm font-medium">
              {busca ? `Nenhum item para "${busca}"` : "Nenhum item no cofre ainda"}
            </p>
            {!busca && (
              <button onClick={abrirCriar} className="text-red-400 hover:underline text-xs mt-2">
                Criar primeiro item
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {itens.map(item => {
              const Icon = CAT_ICON[item.categoria] ?? KeyRound;
              const aberto = expandido === item.id;

              return (
                <div key={item.id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-xl flex flex-col transition-all">

                  {/* Card header */}
                  <div className="p-4 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl border ${CAT_COLOR[item.categoria] ?? CAT_COLOR.outro} shrink-0`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-neutral-900 dark:text-white font-semibold text-sm truncate">{item.nome}</p>
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5 truncate mt-0.5">
                            <ExternalLink size={9} />
                            {item.url.replace(/https?:\/\//, "").slice(0, 35)}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <CatBadge cat={item.categoria} />
                    </div>
                  </div>

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="px-4 pb-2 flex flex-wrap gap-1">
                      {item.tags.map(t => (
                        <span key={t} className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Campos (colapsável) */}
                  <div className="px-4 pb-2">
                    <button onClick={() => setExpandido(aberto ? null : item.id)}
                      className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors mb-1">
                      <ChevronDown size={13} className={`transition-transform ${aberto ? "rotate-180" : ""}`} />
                      {item.campos.length} campo{item.campos.length !== 1 ? "s" : ""}
                    </button>

                    {aberto && (
                      <div className="border-t border-neutral-100 dark:border-neutral-800 pt-2 space-y-0.5">
                        {item.campos.map((campo, idx) => {
                          const key = `${item.id}_${idx}`;
                          return (
                            <CampoRow
                              key={idx}
                              campo={campo}
                              index={idx}
                              itemId={item.id}
                              revelado={revelados[key]}
                              revelando={revelando === key}
                              copiado={copiado === key}
                              onRevelar={() => revelar(item.id, idx)}
                              onCopiar={v => copiar(key, v)}
                            />
                          );
                        })}

                        {/* Notas */}
                        {item.notas && (
                          <div className="mt-2 text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-800 rounded-lg px-3 py-2 italic">
                            {item.notas}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="mt-auto border-t border-neutral-100 dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {item.tem_historico && (
                        <span title="Tem histórico de senhas"
                          className="p-1.5 text-yellow-500">
                          <History size={13} />
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
        )}
      </main>

      {/* ── Drawer criar/editar ─────────────────────────────────────────────── */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="flex-1 bg-black/50" onClick={() => setDrawer(false)} />

          {/* Painel */}
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
            {/* Header drawer */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                {editando ? `Editar — ${editando.nome}` : "Novo Item"}
              </h3>
              <button onClick={() => setDrawer(false)} className="text-neutral-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            {/* Body drawer */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Nome */}
              <div>
                <label className="text-xs text-neutral-500 mb-1.5 block font-medium uppercase tracking-wide">Nome *</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: GNDI — Cotação PME"
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-red-500" />
              </div>

              {/* Categoria */}
              <div>
                <label className="text-xs text-neutral-500 mb-1.5 block font-medium uppercase tracking-wide">Categoria</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS.filter(c => c.id !== "todas").map(c => (
                    <button key={c.id} type="button" onClick={() => setForm(f => ({ ...f, categoria: c.id }))}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                        form.categoria === c.id
                          ? `${CAT_COLOR[c.id]} font-semibold`
                          : "bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:border-neutral-500"
                      }`}>
                      {c.label}
                    </button>
                  ))}
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
                    <span key={t} className="flex items-center gap-1 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-1 rounded-full border border-neutral-200 dark:border-neutral-700">
                      <Tag size={10} /> {t}
                      <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))}
                        className="text-neutral-400 hover:text-red-400 ml-0.5"><X size={10} /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                    placeholder="adicionar tag + Enter"
                    className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-red-500" />
                  <button onClick={addTag} className="px-3 py-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-300 text-sm hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors">
                    + Add
                  </button>
                </div>
              </div>

              {/* Campos dinâmicos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Campos</label>
                  <button onClick={addCampo}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors">
                    <Plus size={12} /> Adicionar campo
                  </button>
                </div>
                <div className="space-y-3">
                  {form.campos.map((campo, i) => (
                    <div key={i} className="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input value={campo.label} onChange={e => setCampo(i, { label: e.target.value })}
                          placeholder="Label (ex: Login)"
                          className="flex-1 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg px-3 py-1.5 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-red-500" />
                        <button onClick={() => removeCampo(i)}
                          className="text-neutral-400 hover:text-red-400 p-1 transition-colors shrink-0">
                          <X size={14} />
                        </button>
                      </div>
                      <input
                        type={campo.oculto ? "password" : "text"}
                        value={campo.valor}
                        onChange={e => setCampo(i, { valor: e.target.value })}
                        placeholder={campo.oculto && editando ? "Deixe vazio para manter atual" : "Valor"}
                        className="w-full bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg px-3 py-1.5 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-red-500 font-mono" />
                      <div className="flex items-center gap-2">
                        <select value={campo.tipo} onChange={e => setCampo(i, { tipo: e.target.value })}
                          className="bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg px-2 py-1 text-neutral-700 dark:text-neutral-300 text-xs focus:outline-none">
                          {TIPOS_CAMPO.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <label className="flex items-center gap-1.5 text-xs text-neutral-500 cursor-pointer ml-auto">
                          <input type="checkbox" checked={campo.oculto}
                            onChange={e => setCampo(i, { oculto: e.target.checked, tipo: e.target.checked ? "password" : campo.tipo })}
                            className="rounded" />
                          <Lock size={11} /> Criptografar
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="text-xs text-neutral-500 mb-1.5 block font-medium uppercase tracking-wide">Notas</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Observações, instruções de uso, contatos..."
                  rows={3}
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-red-500" />
              </div>
            </div>

            {/* Footer drawer */}
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
