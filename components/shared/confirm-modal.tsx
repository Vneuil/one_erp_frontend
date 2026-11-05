"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useModalStore,
  type ConfirmModalOptions,
  type AlertModalOptions,
  type PromptModalOptions,
  type ModalVariant,
} from "@/stores/modal-store";
import { cn } from "@/lib/utils";

export type {
  ModalVariant,
  ConfirmModalOptions,
  AlertModalOptions,
  PromptModalOptions,
};

/**
 * Hook to trigger a confirmation modal.
 * Returns a promise resolving to `true` if confirmed, or `false` if cancelled/closed.
 *
 * @example
 * const confirm = useConfirm();
 * if (!await confirm(`Hapus produk "${name}"?`)) return;
 * // or with full options:
 * const ok = await confirm({
 *   title: "Hapus Produk",
 *   message: `Yakin ingin menghapus produk "${name}"?`,
 *   variant: "destructive",
 *   confirmText: "Hapus",
 * });
 */
export function useConfirm() {
  const confirm = useModalStore((s) => s.confirm);
  return React.useCallback(
    (options: string | ConfirmModalOptions) => confirm(options),
    [confirm]
  );
}

/**
 * Hook to trigger an alert/notification modal.
 * Returns a promise resolving when dismissed.
 *
 * @example
 * const alert = useAlert();
 * await alert("Produk berhasil disimpan!");
 */
export function useAlert() {
  const alert = useModalStore((s) => s.alert);
  return React.useCallback(
    (options: string | AlertModalOptions) => alert(options),
    [alert]
  );
}

/**
 * Hook to trigger a prompt modal for user input / reason / notes.
 * Returns a promise resolving to the string entered, or `null` if cancelled.
 *
 * @example
 * const prompt = usePrompt();
 * const reason = await prompt({
 *   title: "Tolak Purchase Request",
 *   message: "Masukkan alasan penolakan (opsional):",
 *   placeholder: "Alasan penolakan...",
 *   variant: "destructive",
 *   confirmText: "Tolak",
 * });
 * if (reason === null) return; // user cancelled
 */
export function usePrompt() {
  const prompt = useModalStore((s) => s.prompt);
  return React.useCallback(
    (options: string | PromptModalOptions) => prompt(options),
    [prompt]
  );
}

/**
 * Convenient combined hook for confirm, alert, and prompt modals.
 */
export function useConfirmModal() {
  const confirm = useConfirm();
  const alert = useAlert();
  const prompt = usePrompt();
  const close = useModalStore((s) => s.close);

  return { confirm, alert, prompt, close };
}

/**
 * Direct imperative helper functions (can be called outside React hooks if needed).
 */
export const confirmModal = (options: string | ConfirmModalOptions) =>
  useModalStore.getState().confirm(options);

export const alertModal = (options: string | AlertModalOptions) =>
  useModalStore.getState().alert(options);

export const promptModal = (options: string | PromptModalOptions) =>
  useModalStore.getState().prompt(options);

/**
 * Returns an appropriate icon based on variant and content.
 */
function getVariantIcon(variant: ModalVariant, message?: React.ReactNode) {
  if (variant === "destructive") {
    const isDelete =
      typeof message === "string" && /(hapus|delete|remove)/i.test(message);
    return isDelete ? (
      <Trash2 className="h-6 w-6 text-rose-600" />
    ) : (
      <AlertTriangle className="h-6 w-6 text-rose-600" />
    );
  }
  if (variant === "warning") {
    return <AlertTriangle className="h-6 w-6 text-amber-600" />;
  }
  if (variant === "success") {
    return <CheckCircle2 className="h-6 w-6 text-emerald-600" />;
  }
  if (variant === "info") {
    return <Info className="h-6 w-6 text-blue-600" />;
  }
  return <HelpCircle className="h-6 w-6 text-brand-primary" />;
}

/**
 * Returns icon container classes based on variant.
 */
function getIconContainerClasses(variant: ModalVariant) {
  switch (variant) {
    case "destructive":
      return "bg-rose-50 border-rose-200/70 ring-4 ring-rose-50/60";
    case "warning":
      return "bg-amber-50 border-amber-200/70 ring-4 ring-amber-50/60";
    case "success":
      return "bg-emerald-50 border-emerald-200/70 ring-4 ring-emerald-50/60";
    case "info":
      return "bg-blue-50 border-blue-200/70 ring-4 ring-blue-50/60";
    default:
      return "bg-brand-tint border-brand-primary/20 ring-4 ring-brand-tint/60";
  }
}

/**
 * Global Confirm & Alert Modal component.
 * Rendered once at the root/provider level to serve the entire app.
 */
export function ConfirmModal() {
  const {
    isOpen,
    type,
    title,
    message,
    description,
    confirmText,
    cancelText,
    variant,
    icon,
    isLoading,
    promptValue,
    promptPlaceholder,
    promptInputType,
    promptRequired,
    setPromptValue,
    onConfirmAction,
    close,
    setLoading,
  } = useModalStore();

  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      close(false);
    }
  };

  const handleConfirm = async () => {
    if (isLoading) return;
    if (type === "prompt" && promptRequired && !promptValue.trim()) return;

    if (onConfirmAction) {
      try {
        setLoading(true);
        await onConfirmAction();
        close(true);
      } catch (err) {
        setLoading(false);
        // Let the action handler or page handle the error
        throw err;
      }
    } else {
      close(true);
    }
  };

  const handleCancel = () => {
    if (isLoading) return;
    close(false);
  };

  const defaultIcon = getVariantIcon(variant, message);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-md p-6 rounded-2xl border border-border shadow-2xl gap-5 animate-in fade-in-0 zoom-in-95 duration-150"
        onEscapeKeyDown={(e) => {
          if (isLoading) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isLoading) e.preventDefault();
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl border transition-all",
              getIconContainerClasses(variant)
            )}
          >
            {icon ?? defaultIcon}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-base font-semibold text-foreground tracking-tight">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-foreground/80 font-normal leading-relaxed">
                {message}
              </DialogDescription>
            </DialogHeader>

            {description && (
              <div className="mt-2 text-xs text-muted-foreground/90 leading-relaxed bg-muted/50 p-2.5 rounded-lg border border-border/40">
                {description}
              </div>
            )}
          </div>
        </div>

        {type === "prompt" && (
          <div className="space-y-1.5 pt-1">
            {promptInputType === "textarea" ? (
              <Textarea
                rows={3}
                placeholder={promptPlaceholder || "Tuliskan keterangan..."}
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                disabled={isLoading}
                autoFocus
                className="text-sm bg-white border-border focus-visible:ring-brand-primary/30"
              />
            ) : (
              <Input
                type="text"
                placeholder={promptPlaceholder || "Tuliskan keterangan..."}
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                disabled={isLoading}
                autoFocus
                className="text-sm bg-white border-border focus-visible:ring-brand-primary/30"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
              />
            )}
            {promptRequired && !promptValue.trim() && (
              <p className="text-xs text-rose-500 font-medium">Bidang ini wajib diisi.</p>
            )}
          </div>
        )}

        <DialogFooter className="flex-row sm:justify-end gap-2 pt-2 border-t border-border/50">
          {(type === "confirm" || type === "prompt") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1 sm:flex-initial h-9 px-4 font-medium"
            >
              {cancelText || "Batal"}
            </Button>
          )}

          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            size="sm"
            onClick={handleConfirm}
            disabled={
              isLoading ||
              (type === "prompt" && promptRequired && !promptValue.trim())
            }
            className={cn(
              "flex-1 sm:flex-initial h-9 px-4 font-medium transition-all",
              variant === "warning" &&
                "bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/20",
              variant === "info" &&
                "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20"
            )}
            autoFocus={type !== "prompt"}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
            {confirmText ||
              (type === "alert"
                ? "Mengerti"
                : type === "prompt"
                ? "Simpan"
                : "Lanjutkan")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Provider component to mount the global modal and optionally bridge `window.alert`.
 */
export function ConfirmModalProvider({
  children,
  interceptWindowAlert = true,
}: {
  children: React.ReactNode;
  interceptWindowAlert?: boolean;
}) {
  React.useEffect(() => {
    if (!interceptWindowAlert || typeof window === "undefined") return;

    const originalAlert = window.alert;
    window.alert = (message?: unknown) => {
      alertModal({
        title: "Pemberitahuan",
        message: String(message ?? ""),
      });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [interceptWindowAlert]);

  return (
    <>
      {children}
      <ConfirmModal />
    </>
  );
}

/**
 * Declarative confirmation dialog for components that prefer local controlled state.
 */
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  message: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ModalVariant;
  icon?: React.ReactNode;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Konfirmasi",
  message,
  description,
  confirmText = "Lanjutkan",
  cancelText = "Batal",
  variant = "default",
  icon,
  isLoading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const defaultIcon = getVariantIcon(variant, message);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-2xl border border-border shadow-2xl gap-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl border transition-all",
              getIconContainerClasses(variant)
            )}
          >
            {icon ?? defaultIcon}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-base font-semibold text-foreground tracking-tight">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-foreground/80 font-normal leading-relaxed">
                {message}
              </DialogDescription>
            </DialogHeader>

            {description && (
              <div className="mt-2 text-xs text-muted-foreground/90 leading-relaxed bg-muted/50 p-2.5 rounded-lg border border-border/40">
                {description}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row sm:justify-end gap-2 pt-2 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1 sm:flex-initial h-9 px-4 font-medium"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "flex-1 sm:flex-initial h-9 px-4 font-medium transition-all",
              variant === "warning" &&
                "bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/20",
              variant === "info" &&
                "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20"
            )}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
