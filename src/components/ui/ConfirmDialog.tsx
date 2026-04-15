"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/lib/i18n/locale-context";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useLocale();
  const resolvedConfirmLabel = confirmLabel ?? t("form.confirm");
  const resolvedCancelLabel = cancelLabel ?? t("form.cancel");
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("overflow-hidden");
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.classList.remove("overflow-hidden");
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-stone-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        <p id="confirm-dialog-description" className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} autoFocus>
            {resolvedCancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {resolvedConfirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
