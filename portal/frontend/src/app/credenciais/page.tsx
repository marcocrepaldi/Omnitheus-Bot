"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { KeyRound, Save, CheckCircle, Eye, EyeOff } from "lucide-react";
import { authHeader } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL;

interface Robo { id: number; nome: string; descricao: string; }
interface CredencialInfo { id: number; robo_id: number; campos: string[]; dados_publicos: Record<string, string>; }

type Campo = { chave: string; label: string; tipo: "text" | "password"; placeholder?: string };

// Campos que o CLIENTE cadastra
// 2captcha e e-mail remetente são da plataforma (env do servidor)
const CAMPOS_POR_ROBO: Record<number, Campo[]> = {
  1: [
    { chave: "HARPER_URL",  label: "URL do sistema Quiver",       tipo: "text",     placeholder: "https://suacorretora.corretor-online.com.br/" },
    { chave: "HARPER_USER", label: "Usuário Quiver",              tipo: "text" },
    { chave: "HARPER_PASS", label: "Senha Quiver",                tipo: "password" },
    { chave: "EMAIL_TO",    label: "E-mail para receber alertas", tipo: "text",     placeholder: "ti@suacorretora.com.br" },
  ],
  2: [
    { chave: "SUHAI_USER",     label: "Usuário SUHAI",   tipo: "text",     placeholder: "suhai3148" },
    { chave: "SUHAI_PASS",     label: "Senha atual SUHAI",  tipo: "password" },
    { chave: "SUHAI_NEW_PASS", label: "Nova senha SUHAI",   tipo: "password" },
  ],
};

export default function CredenciaisPage() {
  const [robos, setRobos]           = useState<Robo[]>([]);
  const [credenciais, setCredenciais] = useState<CredencialInfo[]>([]);
  const [roboSelecionado, setRoboSelecionado] = useState<number | null>(null);
  const [form, setForm]             = useState<Record<string, string>>({});
  const [mostrar, setMostrar]       = useState<Record<string, boolean>>({});
  const [salvando, setSalvando]     = useState(false);
  const [salvo, setSalvo]           = useState(false);

  useEffect(() => {
    const h = authHeader();
    fetch(`${API}/robos/`, { headers: h }).then(r => r.ok ? r.json() : []).then(d => setRobos(Array.isArray(d) ? d : []));
    fetch(`${API}/credenciais/`, { headers: h }).then(r => r.ok ? r.json() : []).then(d => setCredenciais(Array.isArray(d) ? d : []));
  }, []); // eslint-disable-line

  const selecionarRobo = (id: number) => {
    setRoboSelecionado(id);
    setSalvo(false);
    const campos = CAMPOS_POR_ROBO[id] ?? [];
    // Pré-preenche campos de texto com valores já salvos; senha sempre fica vazia
    const credAtual = credenciais.find(c => c.robo_id === id);
    const dadosPublicos = credAtual?.dados_publicos ?? {};
    setForm(Object.fromEntries(
      campos.map(c => [c.chave, c.tipo === "password" ? "" : (dadosPublicos[c.chave] ?? "")])
    ));
  };

  const salvar = async () => {
    if (!roboSelecionado) return;
    setSalvando(true);
    // Filtra apenas campos preenchidos
    const dadosFiltrados = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v.trim() !== "")
    );
    const res = await fetch(`${API}/credenciais/`, {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ robo_id: roboSelecionado, dados: dadosFiltrados }),
    });
    setSalvando(false);
    if (res.ok) {
      setSalvo(true);
      fetch(`${API}/credenciais/`, { headers: authHeader() }).then(r => r.json()).then(setCredenciais);
    }
  };

  const temCredencial = (roboId: number) => credenciais.some(c => c.robo_id === roboId);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Credenciais</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Configure as credenciais de acesso para cada robô</p>
        </div>

        {/* Lista de robôs disponíveis */}
        <div className="space-y-3 mb-8">
          {robos.map(r => (
            <div key={r.id}
              onClick={() => selecionarRobo(r.id)}
              className={`cursor-pointer bg-white dark:bg-neutral-900 border rounded-xl p-5 flex items-center justify-between transition-all ${
                roboSelecionado === r.id ? "border-blue-500" : "border-neutral-200 dark:border-neutral-800 hover:border-gray-600"
              }`}>
              <div className="flex items-center gap-4">
                <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg"><KeyRound size={18} className="text-gray-300" /></div>
                <div>
                  <p className="text-neutral-900 dark:text-white font-medium">{r.nome}</p>
                  <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">{r.descricao}</p>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                temCredencial(r.id) ? "bg-emerald-900 text-emerald-300" : "bg-yellow-900 text-yellow-300"
              }`}>
                {temCredencial(r.id) ? "✓ Configurado" : "Pendente"}
              </span>
            </div>
          ))}
        </div>

        {/* Formulário de credenciais */}
        {roboSelecionado && (
          <div className="bg-white dark:bg-neutral-900 border border-blue-500/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
              {robos.find(r => r.id === roboSelecionado)?.nome}
            </h3>
            <p className="text-neutral-500 text-xs mb-6">
              Preencha apenas os campos que deseja atualizar. Campos em branco mantêm o valor anterior.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {(CAMPOS_POR_ROBO[roboSelecionado] ?? []).map(campo => (
                <div key={campo.chave} className={campo.chave === "HARPER_URL" ? "col-span-2" : ""}>
                  <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1.5 block">{campo.label}</label>
                  <div className="relative">
                    <input
                      type={campo.tipo === "password" && !mostrar[campo.chave] ? "password" : "text"}
                      value={form[campo.chave] ?? ""}
                      onChange={e => setForm(f => ({ ...f, [campo.chave]: e.target.value }))}
                      placeholder={campo.placeholder ?? (temCredencial(roboSelecionado) ? "••••••• (manter atual)" : "")}
                      className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-neutral-900 dark:text-white placeholder-gray-600 text-sm pr-10 focus:outline-none focus:border-red-500"
                    />
                    {campo.tipo === "password" && (
                      <button onClick={() => setMostrar(m => ({ ...m, [campo.chave]: !m[campo.chave] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-gray-300">
                        {mostrar[campo.chave] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-6">
              <button onClick={salvar} disabled={salvando}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-neutral-900 dark:text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                <Save size={16} /> {salvando ? "Salvando..." : "Salvar Credenciais"}
              </button>
              {salvo && (
                <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
                  <CheckCircle size={16} /> Salvo com sucesso!
                </span>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
