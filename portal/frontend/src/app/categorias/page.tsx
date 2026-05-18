"use client";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import ConfirmModal from "@/components/ConfirmModal";
import {
  Tag, Plus, Pencil, Trash2, X, Save, RefreshCw,
  ShieldCheck, Monitor, Building2, CreditCard, Mail, KeyRound,
  Car, HeartPulse, Lock,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

interface Categoria {
  id: number; nome: string; slug: string;
  icone: string | null; cor: string | null;
  ordem: number; sistema: boolean; qtd_itens: number;
}

const ICONES_DISPONIVEIS: Record<string, any> = {
  ShieldCheck, Monitor, Building2, CreditCard, Mail, KeyRound,
  Car, HeartPulse, Lock, Tag,
};
const CORES_DISPONIVEIS = [
  "red", "rose", "orange", "amber", "yellow", "lime", "green",
  "emerald", "teal", "cyan", "blue", "indigo", "purple", "neutral",
];

const COR_CLASSE: Record<string, string> = {
  red: "bg-red-900/30 text-red-400 border-red-800/50",
  rose: "bg-rose-900/30 text-rose-400 border-rose-800/50",
  orange: "bg-orange-900/30 text-orange-400 border-orange-800/50",
  amber: "bg-amber-900/30 text-amber-400 border-amber-800/50",
  yellow: "bg-yellow-900/30 text-yellow-400 border-yellow-800/50",
  lime: "bg-lime-900/30 text-lime-400 border-lime-800/50",
  green: "bg-green-900/30 text-green-400 border-green-800/50",
  emerald: "bg-emerald-900/30 text-emerald-400 border-emerald-800/50",
  teal: "bg-teal-900/30 text-teal-400 border-teal-800/50",
  cyan: "bg-cyan-900/30 text-cyan-400 border-cyan-800/50",
  blue: "bg-blue-900/30 text-blue-400 border-blue-800/50",
  indigo: "bg-indigo-900/30 text-indigo-400 border-indigo-800/50",
  purple: "bg-purple-900/30 text-purple-400 border-purple-800/50",
  neutral: "bg-neutral-800 text-neutral-400 border-neutral-700",
};

export default function CategoriasPage() {
  const [itens, setItens] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [form, setForm] = useState({ nome: "", icone: "Tag", cor: "neutral", ordem: 0 });
  const [salvando, setSalvando] = useState(false);
  const [confirmDel, setConfirmDel] = useState<{ open: boolean; id: number; nome: string }>({ open: false, id: 0, nome: "" });

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const { apiFetch } = await import("@/lib/auth");
    return apiFetch(`${API}${path}`, init);
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    const r = await api("/categorias/");
    setItens(r.ok ? await r.json() : []);
    setLoading(false);
  }, [api]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirCriar = () => { setEditando(null); setForm({ nome: "", icone: "Tag", cor: "neutral", ordem: 0 }); setDrawer(true); };
  const abrirEditar = (c: Categoria) => {
    setEditando(c);
    setForm({ nome: c.nome, icone: c.icone ?? "Tag", cor: c.cor ?? "neutral", ordem: c.ordem });
    setDrawer(true);
  };

  const salvar = async () => {
    if (!form.nome.trim()) return;
    setSalvando(true);
    const path = editando ? `/categorias/${editando.id}` : "/categorias/";
    const method = editando ? "PUT" : "POST";
    const r = await api(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSalvando(false);
    if (r.ok) { setDrawer(false); carregar(); }
    else { const e = await r.json(); alert(e.detail || "Erro"); }
  };

  const deletar = async () => {
    const r = await api(`/categorias/${confirmDel.id}`, { method: "DELETE" });
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
              <Tag size={22} className="text-red-500" /> Categorias do Cofre
            </h2>
            <p className="text-neutral-500 text-sm mt-1">Organize os itens do cofre — base do controle de acesso por time</p>
          </div>
          <button onClick={abrirCriar}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Nova Categoria
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-neutral-500 text-sm"><RefreshCw size={16} className="animate-spin" />Carregando...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {itens.map(c => {
              const Icon = ICONES_DISPONIVEIS[c.icone ?? "Tag"] ?? Tag;
              const cls  = COR_CLASSE[c.cor ?? "neutral"] ?? COR_CLASSE.neutral;
              return (
                <div key={c.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-xl flex flex-col transition-all">
                  <div className="p-5 flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-3 rounded-xl border ${cls}`}><Icon size={20} /></div>
                      {c.sistema && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-800">sistema</span>
                      )}
                    </div>
                    <p className="text-neutral-900 dark:text-white font-semibold text-sm">{c.nome}</p>
                    <p className="text-neutral-500 text-xs font-mono mt-0.5">{c.slug}</p>
                    <p className="text-xs text-neutral-400 mt-2">{c.qtd_itens} {c.qtd_itens === 1 ? "item" : "itens"} no cofre</p>
                  </div>
                  <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-3 flex justify-end gap-1">
                    <button onClick={() => abrirEditar(c)} className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"><Pencil size={14} /></button>
                    {!c.sistema && (
                      <button onClick={() => setConfirmDel({ open: true, id: c.id, nome: c.nome })} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-900/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Drawer criar/editar */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setDrawer(false)} />
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="font-semibold text-neutral-900 dark:text-white">{editando ? "Editar Categoria" : "Nova Categoria"}</h3>
              <button onClick={() => setDrawer(false)} className="text-neutral-400 hover:text-white p-1"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <label className="text-xs font-medium text-neutral-500 uppercase mb-1.5 block">Nome</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Banco"
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 uppercase mb-1.5 block">Ícone</label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(ICONES_DISPONIVEIS).map(([nome, Icon]) => (
                    <button key={nome} type="button" onClick={() => setForm(f => ({ ...f, icone: nome }))}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-center ${
                        form.icone === nome
                          ? "bg-red-600 border-red-500 text-white"
                          : "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-400"
                      }`}><Icon size={18} /></button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 uppercase mb-1.5 block">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {CORES_DISPONIVEIS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, cor: c }))}
                      className={`w-10 h-10 rounded-lg border-2 ${COR_CLASSE[c]} ${form.cor === c ? "ring-2 ring-offset-2 ring-offset-neutral-900 ring-white" : ""}`} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 uppercase mb-1.5 block">Ordem</label>
                <input type="number" value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-red-500" />
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
        titulo="Excluir categoria"
        descricao={`Excluir "${confirmDel.nome}"? Só pode excluir se não houver itens vinculados.`}
        confirmLabel="Excluir" variante="danger"
        onConfirm={deletar}
        onCancel={() => setConfirmDel(c => ({ ...c, open: false }))} />
    </div>
  );
}
