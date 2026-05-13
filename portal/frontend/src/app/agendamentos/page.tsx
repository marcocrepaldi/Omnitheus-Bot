"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, Trash2, CalendarClock, Clock, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const API = process.env.NEXT_PUBLIC_API_URL;

interface Agendamento {
  id: number; robo_id: number; cron_expr: string;
  ativo: boolean; proximo_run: string | null; criado_em: string;
}
interface Robo { id: number; nome: string; }

// ─── Cron helpers ─────────────────────────────────────────────────────────────

const DIAS_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HORAS = Array.from({ length: 24 }, (_, i) => i);
const MINUTOS = [0, 15, 30, 45];

type Freq = "diario" | "semana" | "dias" | "horario" | "personalizado";

interface FormState {
  robo_id: number; freq: Freq; hora: number; minuto: number;
  dias: number[]; cron_custom: string; ativo: boolean;
}

function buildCron(f: FormState): string {
  const m = f.minuto; const h = f.hora;
  if (f.freq === "horario")       return "0 * * * *";
  if (f.freq === "diario")        return `${m} ${h} * * *`;
  if (f.freq === "semana")        return `${m} ${h} * * 1-5`;
  if (f.freq === "personalizado") return f.cron_custom;
  const sorted = [...f.dias].sort((a, b) => a - b);
  if (sorted.length === 0) return `${m} ${h} * * *`;
  return `${m} ${h} * * ${sorted.join(",")}`;
}

function cronToHuman(expr: string): string {
  try {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) return expr;
    const [min, hr, , , dow] = parts;
    const pad = (n: string) => n.padStart(2, "0");
    const time = hr === "*" ? "" : ` às ${pad(hr)}:${pad(min)}`;
    if (hr === "*" && min === "0") return "A cada hora";
    if (dow === "*")  return `Todo dia${time}`;
    if (dow === "1-5") return `Seg a Sex${time}`;
    if (dow === "0-6") return `Todos os dias${time}`;
    const nums = dow.split(",").map(Number);
    const labels = nums.map(n => DIAS_LABEL[n]);
    const last = labels.pop()!;
    return `${labels.length ? labels.join(", ") + " e " : ""}${last}${time}`;
  } catch { return expr; }
}

function humanPreview(f: FormState): string {
  if (f.freq === "horario") return "A cada hora";
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `às ${pad(f.hora)}:${pad(f.minuto)}`;
  if (f.freq === "diario")  return `Todo dia ${time}`;
  if (f.freq === "semana")  return `De segunda a sexta ${time}`;
  if (f.freq === "personalizado") return f.cron_custom || "—";
  if (f.freq === "dias") {
    if (f.dias.length === 0) return "Selecione ao menos um dia";
    const sorted = [...f.dias].sort((a, b) => a - b);
    const labels = sorted.map(n => DIAS_LABEL[n]);
    const last = labels.pop()!;
    return `${labels.length ? labels.join(", ") + " e " : ""}${last} ${time}`;
  }
  return "—";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const FREQ_OPTIONS: { id: Freq; label: string; desc: string; emoji: string }[] = [
  { id: "diario",        label: "Todo dia",        desc: "1× por dia",           emoji: "☀️" },
  { id: "semana",        label: "Seg a Sex",        desc: "Dias úteis",           emoji: "📅" },
  { id: "dias",          label: "Dias escolhidos",  desc: "Você define quais",    emoji: "🗓️" },
  { id: "horario",       label: "A cada hora",      desc: "Toda hora em ponto",   emoji: "⏱️" },
  { id: "personalizado", label: "Avançado",         desc: "Expressão cron",       emoji: "⚙️" },
];

function FreqPicker({ value, onChange }: { value: Freq; onChange: (v: Freq) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {FREQ_OPTIONS.map(opt => (
        <button key={opt.id} type="button" onClick={() => onChange(opt.id)}
          className={`flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl border text-left transition-all ${
            value === opt.id
              ? "bg-red-600 border-red-500 text-white"
              : "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500"
          }`}>
          <span className="text-lg leading-none">{opt.emoji}</span>
          <span className="text-sm font-semibold mt-1">{opt.label}</span>
          <span className={`text-xs ${value === opt.id ? "text-red-100" : "text-neutral-500"}`}>{opt.desc}</span>
        </button>
      ))}
    </div>
  );
}

function TimePicker({ hora, minuto, onChange }: { hora: number; minuto: number; onChange: (h: number, m: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <Clock size={16} className="text-neutral-400 shrink-0" />
      <div className="flex items-center gap-2">
        <select value={hora} onChange={e => onChange(Number(e.target.value), minuto)}
          className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-red-500">
          {HORAS.map(h => <option key={h} value={h}>{String(h).padStart(2, "0")}h</option>)}
        </select>
        <span className="text-neutral-400 font-bold">:</span>
        <select value={minuto} onChange={e => onChange(hora, Number(e.target.value))}
          className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-red-500">
          {MINUTOS.map(m => <option key={m} value={m}>{String(m).padStart(2, "0")}min</option>)}
        </select>
      </div>
    </div>
  );
}

function DaysPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const toggle = (d: number) => onChange(value.includes(d) ? value.filter(x => x !== d) : [...value, d]);
  return (
    <div className="flex gap-2 flex-wrap">
      {DIAS_LABEL.map((label, i) => (
        <button key={i} type="button" onClick={() => toggle(i)}
          className={`w-12 h-12 rounded-xl text-sm font-semibold border transition-all ${
            value.includes(i)
              ? "bg-red-600 border-red-500 text-white"
              : "bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-500"
          }`}>
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const defaultForm = (): FormState => ({
  robo_id: 0, freq: "diario", hora: 8, minuto: 0, dias: [], cron_custom: "", ativo: true,
});

export default function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [robos, setRobos] = useState<Robo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm());

  const carregar = () => {
    import("@/lib/auth").then(({ authHeader }) => {
      const h = authHeader();
      fetch(`${API}/agendamentos/`, { headers: h })
        .then(r => r.ok ? r.json() : [])
        .then(data => setAgendamentos(Array.isArray(data) ? data : []));
      fetch(`${API}/robos/`, { headers: h })
        .then(r => r.ok ? r.json() : [])
        .then(data => setRobos(Array.isArray(data) ? data : []));
    });
  };
  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    const cron_expr = buildCron(form);
    if (!cron_expr || form.robo_id === 0) return;
    if (form.freq === "dias" && form.dias.length === 0) return;
    const { authHeader } = await import("@/lib/auth");
    await fetch(`${API}/agendamentos/`, {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ robo_id: form.robo_id, cron_expr, ativo: form.ativo }),
    });
    setShowForm(false); setForm(defaultForm()); carregar();
  };

  const deletar = async (id: number) => {
    if (!confirm("Excluir este agendamento?")) return;
    const { authHeader } = await import("@/lib/auth");
    await fetch(`${API}/agendamentos/${id}`, { method: "DELETE", headers: authHeader() });
    carregar();
  };

  const nomeRobo = (id: number) => robos.find(r => r.id === id)?.nome ?? `#${id}`;
  const preview = humanPreview(form);
  const canSave = form.robo_id !== 0
    && (form.freq !== "dias" || form.dias.length > 0)
    && (form.freq !== "personalizado" || form.cron_custom.trim() !== "");

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Agendamentos</h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Configure quando cada robô executa automaticamente</p>
          </div>
          {!showForm && (
            <button onClick={() => { setForm(defaultForm()); setShowForm(true); }}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus size={16} /> Novo Agendamento
            </button>
          )}
        </div>

        {/* Formulário */}
        {showForm && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 mb-6 shadow-sm">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-5">Configurar Agendamento</h3>
            <div className="space-y-6">
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2 block">Robô</label>
                <select value={form.robo_id} onChange={e => setForm(f => ({ ...f, robo_id: Number(e.target.value) }))}
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-red-500">
                  <option value={0}>Selecione o robô...</option>
                  {robos.filter(r => ![2, 3].includes(r.id)).map(r => (
                    <option key={r.id} value={r.id}>{r.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2 block">Com que frequência?</label>
                <FreqPicker value={form.freq} onChange={freq => setForm(f => ({ ...f, freq, dias: [] }))} />
              </div>
              {form.freq !== "horario" && form.freq !== "personalizado" && (
                <div>
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2 block">Horário de execução</label>
                  <TimePicker hora={form.hora} minuto={form.minuto} onChange={(hora, minuto) => setForm(f => ({ ...f, hora, minuto }))} />
                </div>
              )}
              {form.freq === "dias" && (
                <div>
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2 block">Quais dias?</label>
                  <DaysPicker value={form.dias} onChange={dias => setForm(f => ({ ...f, dias }))} />
                </div>
              )}
              {form.freq === "personalizado" && (
                <div>
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2 block">Expressão Cron</label>
                  <input value={form.cron_custom} onChange={e => setForm(f => ({ ...f, cron_custom: e.target.value }))}
                    placeholder="ex: 0 8 * * *"
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white font-mono text-sm focus:outline-none focus:border-red-500 placeholder-neutral-400" />
                  <p className="text-xs text-neutral-500 mt-1.5">minuto hora dia-mês mês dia-semana</p>
                </div>
              )}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                canSave
                  ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300"
                  : "bg-neutral-100 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 text-neutral-500"
              }`}>
                <CalendarClock size={16} className="shrink-0" />
                <span className="text-sm font-medium">
                  {form.robo_id === 0 ? "Selecione um robô para continuar"
                    : canSave ? `${nomeRobo(form.robo_id)} vai executar: ${preview}`
                    : preview}
                </span>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={salvar} disabled={!canSave}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                  <Check size={15} /> Salvar Agendamento
                </button>
                <button onClick={() => { setShowForm(false); setForm(defaultForm()); }}
                  className="bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grid 3 colunas */}
        {agendamentos.length === 0 && !showForm ? (
          <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <CalendarClock size={40} className="text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm font-medium">Nenhum agendamento configurado</p>
            <p className="text-neutral-400 text-xs mt-1">Clique em <strong className="text-neutral-300">Novo Agendamento</strong> para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {agendamentos.map(ag => (
              <div key={ag.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-xl flex flex-col transition-all">
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 bg-purple-900/30 rounded-xl">
                      <CalendarClock size={18} className="text-purple-400" />
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      ag.ativo
                        ? "bg-emerald-900/50 text-emerald-300 border border-emerald-800"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border border-neutral-700"
                    }`}>
                      {ag.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="text-neutral-900 dark:text-white font-semibold text-sm">{nomeRobo(ag.robo_id)}</p>
                  <p className="text-neutral-700 dark:text-neutral-300 text-sm mt-1">{cronToHuman(ag.cron_expr)}</p>
                  {ag.proximo_run && (
                    <p className="text-neutral-400 text-xs mt-2 flex items-center gap-1">
                      <Clock size={11} />
                      Próxima: {format(new Date(ag.proximo_run), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
                <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-3 flex justify-end">
                  <button onClick={() => deletar(ag.id)} title="Excluir"
                    className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-900/10 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
