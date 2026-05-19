"use client";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import {
  BarChart2, RefreshCw, Search, CheckCircle2, DollarSign,
  TrendingUp, FileText, Filter,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

interface Registro {
  id: number;
  calculo: string;
  inicio_vigencia: string | null;
  cliente: string | null;
  cpf_cnpj: string | null;
  item: string | null;
  ramo: string | null;
  situacao: string | null;
  status_painel: string | null;
  seguradora: string | null;
  premio_fechado: number | null;
  comissao_fechado: number | null;
  pct_comissao: number | null;
  premio_liquido: number | null;
  data_efetivacao: string | null;
  grupo_producao: string | null;
  usuario: string | null;
  tipo_orcamento: string | null;
  proposta_cia: string | null;
  importado_em: string | null;
}

interface Resumo {
  total_efetivados: number;
  premio_total: number;
  comissao_total: number;
  por_seguradora: { seguradora: string; qtd: number; premio: number }[];
}

const brl = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const pct = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`);

const COR_STATUS: Record<string, string> = {
  "NEGÓCIO FECHADO": "bg-emerald-900/40 text-emerald-300",
  "EM ANDAMENTO":    "bg-yellow-900/40 text-yellow-300",
  "Efetivado":       "bg-emerald-900/40 text-emerald-300",
  "Calculado":       "bg-blue-900/40 text-blue-300",
  "Preenchimento":   "bg-neutral-700/60 text-neutral-300",
};

function StatusBadge({ v }: { v: string | null }) {
  if (!v) return <span className="text-neutral-500">—</span>;
  const cls = COR_STATUS[v] ?? "bg-neutral-700/60 text-neutral-300";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${cls}`}>
      {v}
    </span>
  );
}

export default function RelatorioVendasPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [resumo,    setResumo]    = useState<Resumo | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [total,     setTotal]     = useState(0);

  const [dataDe,     setDataDe]     = useState("");
  const [dataAte,    setDataAte]    = useState("");
  const [situacao,   setSituacao]   = useState("");
  const [seguradora, setSeguradora] = useState("");
  const [busca,      setBusca]      = useState("");

  const api = useCallback(async (path: string) => {
    const { apiFetch } = await import("@/lib/auth");
    return apiFetch(`${API}${path}`);
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (dataDe)     p.set("data_de",    dataDe);
    if (dataAte)    p.set("data_ate",   dataAte);
    if (situacao)   p.set("situacao",   situacao);
    if (seguradora) p.set("seguradora", seguradora);
    p.set("limit", "500");

    const [rList, rRes] = await Promise.all([
      api(`/relatorio-vendas/?${p}`),
      api(`/relatorio-vendas/resumo?${p}`),
    ]);

    if (rList.ok) {
      const d = await rList.json();
      setRegistros(d.items ?? []);
      setTotal(d.total ?? 0);
    }
    if (rRes.ok) setResumo(await rRes.json());

    setLoading(false);
  }, [api, dataDe, dataAte, situacao, seguradora]);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = busca
    ? registros.filter(r =>
        [r.cliente, r.item, r.calculo, r.seguradora, r.usuario]
          .some(v => v?.toLowerCase().includes(busca.toLowerCase()))
      )
    : registros;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-h-screen bg-neutral-50 dark:bg-neutral-950 p-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <BarChart2 size={22} className="text-red-500" /> Relatório de Vendas
            </h2>
            <p className="text-neutral-500 text-sm mt-1">
              Orçamento por Situação · importado diariamente às 06:00 via Robô 4
            </p>
          </div>
          <button onClick={carregar}
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-white bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-3 py-2 rounded-lg transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-neutral-500 text-sm mb-1">
              <CheckCircle2 size={16} className="text-emerald-500" /> Negócios Fechados
            </div>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white">
              {resumo?.total_efetivados ?? "—"}
            </p>
            <p className="text-xs text-neutral-500 mt-1">no período filtrado</p>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-neutral-500 text-sm mb-1">
              <DollarSign size={16} className="text-blue-500" /> Prêmio Total
            </div>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white">
              {brl(resumo?.premio_total ?? null)}
            </p>
            <p className="text-xs text-neutral-500 mt-1">negócios efetivados</p>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-neutral-500 text-sm mb-1">
              <TrendingUp size={16} className="text-yellow-500" /> Comissão Total
            </div>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white">
              {brl(resumo?.comissao_total ?? null)}
            </p>
            <p className="text-xs text-neutral-500 mt-1">negócios efetivados</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">De (dd/mm/aaaa)</label>
            <input value={dataDe} onChange={e => setDataDe(e.target.value)}
              placeholder="01/05/2026"
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-red-500" />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Até (dd/mm/aaaa)</label>
            <input value={dataAte} onChange={e => setDataAte(e.target.value)}
              placeholder="31/05/2026"
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-red-500" />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Situação</label>
            <select value={situacao} onChange={e => setSituacao(e.target.value)}
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 focus:outline-none focus:border-red-500">
              <option value="">Todas</option>
              <option value="Efetivado">Efetivado</option>
              <option value="Calculado">Calculado</option>
              <option value="Preenchimento">Preenchimento</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Seguradora</label>
            <input value={seguradora} onChange={e => setSeguradora(e.target.value)}
              placeholder="Ex: TOKIO MARINE"
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-red-500" />
          </div>
        </div>

        {/* Busca rápida */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por cliente, item, cálculo, seguradora..."
            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-red-500" />
        </div>

        {/* Contagem */}
        {!loading && (
          <p className="text-xs text-neutral-500 mb-3">
            {filtrados.length} registro{filtrados.length !== 1 ? "s" : ""} exibido{filtrados.length !== 1 ? "s" : ""}
            {total > filtrados.length ? ` de ${total} total` : ""}
          </p>
        )}

        {/* Tabela */}
        {loading ? (
          <div className="flex items-center gap-3 text-neutral-500 text-sm py-10">
            <RefreshCw size={16} className="animate-spin" /> Carregando...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <FileText size={40} className="text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm font-medium">Nenhum registro encontrado</p>
            <p className="text-neutral-400 text-xs mt-1">
              O Robô 4 importa automaticamente às 06:00 · você também pode disparar manualmente em /robos
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">Cálculo</th>
                    <th className="text-left px-4 py-3 font-medium">Vigência</th>
                    <th className="text-left px-4 py-3 font-medium">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium">Item / Bem</th>
                    <th className="text-left px-4 py-3 font-medium">Ramo</th>
                    <th className="text-left px-4 py-3 font-medium">Seguradora</th>
                    <th className="text-right px-4 py-3 font-medium">Prêmio</th>
                    <th className="text-right px-4 py-3 font-medium">Comissão</th>
                    <th className="text-right px-4 py-3 font-medium">%</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Corretor</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((r, i) => (
                    <tr key={r.id}
                      className={`${i > 0 ? "border-t border-neutral-100 dark:border-neutral-800" : ""} hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors`}>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-500">{r.calculo}</td>
                      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                        {r.inicio_vigencia ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-neutral-900 dark:text-white font-medium max-w-[180px] truncate" title={r.cliente ?? ""}>
                          {r.cliente ?? "—"}
                        </div>
                        {r.cpf_cnpj && (
                          <div className="text-xs text-neutral-400 font-mono">{r.cpf_cnpj}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 max-w-[200px] truncate" title={r.item ?? ""}>
                        {r.item ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 whitespace-nowrap text-xs">
                        {r.ramo ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-neutral-900 dark:text-white font-medium whitespace-nowrap">
                          {r.seguradora || "—"}
                        </span>
                        {r.proposta_cia && (
                          <div className="text-xs text-neutral-400 font-mono">{r.proposta_cia}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-900 dark:text-white font-medium whitespace-nowrap">
                        {brl(r.premio_fechado)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                        {brl(r.comissao_fechado)}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-500 whitespace-nowrap">
                        {pct(r.pct_comissao)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge v={r.status_painel ?? r.situacao} />
                      </td>
                      <td className="px-4 py-3 text-neutral-500 text-xs whitespace-nowrap">
                        {r.usuario ?? r.grupo_producao ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ranking por seguradora */}
        {!loading && resumo && resumo.por_seguradora.length > 0 && (
          <div className="mt-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Ranking por Seguradora</h3>
              <p className="text-xs text-neutral-500 mt-0.5">negócios efetivados · ordenado por prêmio</p>
            </div>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {resumo.por_seguradora.map((s, i) => (
                <div key={s.seguradora} className="flex items-center gap-4 px-5 py-3">
                  <span className="text-xs font-mono text-neutral-400 w-5">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium text-neutral-900 dark:text-white">{s.seguradora}</span>
                  <span className="text-xs text-neutral-500">{s.qtd} negócio{s.qtd !== 1 ? "s" : ""}</span>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">{brl(s.premio)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
