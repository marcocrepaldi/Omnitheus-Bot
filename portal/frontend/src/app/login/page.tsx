"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, salvarSessao } from "@/lib/auth";
import { Bot } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]   = useState("");
  const [senha, setSenha]   = useState("");
  const [erro, setErro]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      const data = await login(email, senha);
      salvarSessao(data);
      router.push("/");
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-4">
            <Bot size={32} className="text-neutral-900 dark:text-white" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Portal Robôs</h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Faça login para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 space-y-5">
          {erro && (
            <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-sm text-neutral-500 dark:text-neutral-400 mb-1.5">E-mail</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-500 dark:text-neutral-400 mb-1.5">Senha</label>
            <input
              type="password" required value={senha} onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-neutral-900 dark:text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-neutral-600 text-xs mt-6">
          Harper Seguros © 2026 · Portal de Automações
        </p>
      </div>
    </div>
  );
}
