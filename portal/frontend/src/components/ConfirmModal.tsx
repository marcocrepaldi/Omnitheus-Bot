"use client";
import { useEffect } from "react";

interface Props {
  open: boolean;
  titulo: string;
  descricao?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variante?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open, titulo, descricao,
  confirmLabel = "Confirmar", cancelLabel = "Cancelar",
  variante = "default", onConfirm, onCancel,
}: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const btnClass = variante === "danger"
    ? "bg-red-600 hover:bg-red-700"
    : "bg-red-600 hover:bg-red-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-50 dark:bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Modal */}
      <div className="relative bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-fade-in">
        <h3 className="text-neutral-900 dark:text-white font-semibold text-lg mb-1">{titulo}</h3>
        {descricao && <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6">{descricao}</p>}
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:bg-neutral-700 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-neutral-900 dark:text-white transition-colors ${btnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
