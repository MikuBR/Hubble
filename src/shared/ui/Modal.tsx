"use client";

import { forwardRef, HTMLAttributes } from "react";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { createPortal } from "react-dom";

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ open, onClose, title, description, size = "md", children, className, ...props }, ref) => {
    if (!open) return null;

    const sizes = {
      sm: "max-w-sm",
      md: "max-w-md",
      lg: "max-w-lg",
      xl: "max-w-xl",
      full: "max-w-4xl",
    };

    const modalContent = (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal */}
        <div
          ref={ref}
          className={cn(
            "relative w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-200",
            sizes[size],
            className
          )}
          {...props}
        >
          {(title || description) && (
            <div className="px-6 py-4 border-b border-zinc-800 flex items-start justify-between gap-4">
              <div>
                {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
                {description && <p className="text-sm text-zinc-400 mt-1">{description}</p>}
              </div>
              <button
                onClick={onClose}
                className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="p-6">{children}</div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  }
);

Modal.displayName = "Modal";

interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "default";
  loading?: boolean;
}

export function AlertDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  loading = false,
}: AlertDialogProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm" title={title} description={description}>
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${
            variant === "danger"
              ? "bg-red-600 hover:bg-red-700"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {loading ? "Aguarde..." : confirmText}
        </button>
      </div>
    </Modal>
  );
}