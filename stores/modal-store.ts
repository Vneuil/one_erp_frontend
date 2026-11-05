import { create } from "zustand";
import * as React from "react";

export type ModalVariant = "default" | "destructive" | "warning" | "info" | "success";

export interface ConfirmModalOptions {
  title?: React.ReactNode;
  message?: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ModalVariant;
  icon?: React.ReactNode;
  /**
   * Optional async action to run upon clicking confirm.
   * If provided, the modal will display a loading state on the confirm button
   * until the action completes.
   */
  onConfirm?: () => Promise<void> | void;
}

export interface AlertModalOptions {
  title?: React.ReactNode;
  message?: React.ReactNode;
  description?: React.ReactNode;
  buttonText?: string;
  variant?: ModalVariant;
  icon?: React.ReactNode;
}

export interface PromptModalOptions {
  title?: React.ReactNode;
  message?: React.ReactNode;
  description?: React.ReactNode;
  defaultValue?: string;
  placeholder?: string;
  inputType?: "text" | "textarea";
  required?: boolean;
  confirmText?: string;
  cancelText?: string;
  variant?: ModalVariant;
  icon?: React.ReactNode;
}

interface ModalState {
  isOpen: boolean;
  type: "confirm" | "alert" | "prompt";
  title: React.ReactNode;
  message: React.ReactNode;
  description?: React.ReactNode;
  confirmText: string;
  cancelText: string;
  variant: ModalVariant;
  icon?: React.ReactNode;
  isLoading: boolean;
  promptValue: string;
  promptPlaceholder: string;
  promptInputType: "text" | "textarea";
  promptRequired: boolean;
  setPromptValue: (val: string) => void;
  onConfirmAction?: () => Promise<void> | void;
  _resolve?: (confirmed: boolean) => void;
  _resolvePrompt?: (value: string | null) => void;

  confirm: (options: string | ConfirmModalOptions) => Promise<boolean>;
  alert: (options: string | AlertModalOptions) => Promise<void>;
  prompt: (options: string | PromptModalOptions) => Promise<string | null>;
  close: (result?: boolean) => void;
  setLoading: (loading: boolean) => void;
}

function parseConfirmOptions(input: string | ConfirmModalOptions): {
  title: React.ReactNode;
  message: React.ReactNode;
  description?: React.ReactNode;
  confirmText: string;
  cancelText: string;
  variant: ModalVariant;
  icon?: React.ReactNode;
  onConfirm?: () => Promise<void> | void;
} {
  if (typeof input === "string") {
    const isDestructive = /(hapus|delete|remove|batal|void|cabut|disconnect|tolak|reject)/i.test(input);
    const isCancel = /(batal|cancel|void)/i.test(input);
    const isReject = /(tolak|reject)/i.test(input);
    return {
      title: isCancel ? "Konfirmasi Pembatalan" : isReject ? "Konfirmasi Penolakan" : isDestructive ? "Konfirmasi Hapus" : "Konfirmasi",
      message: input,
      confirmText: isCancel ? "Ya, Batalkan" : isReject ? "Tolak" : isDestructive ? "Hapus" : "Lanjutkan",
      cancelText: "Batal",
      variant: isDestructive ? "destructive" : "default",
    };
  }

  const isDestructive =
    input.variant === "destructive" ||
    (typeof input.message === "string" && /(hapus|delete|remove|tolak|reject|batal)/i.test(input.message));

  return {
    title: input.title ?? (isDestructive ? "Konfirmasi Tindakan" : "Konfirmasi"),
    message: input.message ?? "",
    description: input.description,
    confirmText: input.confirmText ?? (isDestructive ? "Lanjutkan" : "Konfirmasi"),
    cancelText: input.cancelText ?? "Batal",
    variant: input.variant ?? (isDestructive ? "destructive" : "default"),
    icon: input.icon,
    onConfirm: input.onConfirm,
  };
}

function parseAlertOptions(input: string | AlertModalOptions): {
  title: React.ReactNode;
  message: React.ReactNode;
  description?: React.ReactNode;
  buttonText: string;
  variant: ModalVariant;
  icon?: React.ReactNode;
} {
  if (typeof input === "string") {
    const isError = /(gagal|error|tidak dapat|kesalahan|periksa)/i.test(input);
    return {
      title: isError ? "Pemberitahuan Kesalahan" : "Pemberitahuan",
      message: input,
      buttonText: "Mengerti",
      variant: isError ? "destructive" : "info",
    };
  }

  return {
    title: input.title ?? "Pemberitahuan",
    message: input.message ?? "",
    description: input.description,
    buttonText: input.buttonText ?? "Mengerti",
    variant: input.variant ?? "info",
    icon: input.icon,
  };
}

function parsePromptOptions(input: string | PromptModalOptions): {
  title: React.ReactNode;
  message: React.ReactNode;
  description?: React.ReactNode;
  defaultValue: string;
  placeholder: string;
  inputType: "text" | "textarea";
  required: boolean;
  confirmText: string;
  cancelText: string;
  variant: ModalVariant;
  icon?: React.ReactNode;
} {
  if (typeof input === "string") {
    const isReject = /(tolak|reject)/i.test(input);
    const isCancel = /(batal|cancel|void)/i.test(input);
    return {
      title: isReject ? "Konfirmasi Penolakan" : isCancel ? "Konfirmasi Pembatalan" : "Masukkan Keterangan",
      message: input,
      defaultValue: "",
      placeholder: isReject ? "Tuliskan alasan penolakan..." : "Tuliskan keterangan...",
      inputType: "textarea",
      required: false,
      confirmText: isReject ? "Tolak" : isCancel ? "Batalkan" : "Simpan",
      cancelText: "Batal",
      variant: isReject || isCancel ? "destructive" : "default",
    };
  }

  const isReject =
    input.variant === "destructive" ||
    (typeof input.title === "string" && /(tolak|reject)/i.test(input.title)) ||
    (typeof input.message === "string" && /(tolak|reject)/i.test(input.message));

  return {
    title: input.title ?? (isReject ? "Konfirmasi Penolakan" : "Masukkan Keterangan"),
    message: input.message ?? "",
    description: input.description,
    defaultValue: input.defaultValue ?? "",
    placeholder: input.placeholder ?? (isReject ? "Tuliskan alasan penolakan..." : "Tuliskan keterangan..."),
    inputType: input.inputType ?? "textarea",
    required: input.required ?? false,
    confirmText: input.confirmText ?? (isReject ? "Tolak" : "Simpan"),
    cancelText: input.cancelText ?? "Batal",
    variant: input.variant ?? (isReject ? "destructive" : "default"),
    icon: input.icon,
  };
}

export const useModalStore = create<ModalState>((set, get) => ({
  isOpen: false,
  type: "confirm",
  title: "",
  message: "",
  description: undefined,
  confirmText: "Lanjutkan",
  cancelText: "Batal",
  variant: "default",
  icon: undefined,
  isLoading: false,
  promptValue: "",
  promptPlaceholder: "",
  promptInputType: "textarea",
  promptRequired: false,
  setPromptValue: (val) => set({ promptValue: val }),
  onConfirmAction: undefined,
  _resolve: undefined,
  _resolvePrompt: undefined,

  confirm: (options) => {
    const parsed = parseConfirmOptions(options);

    const existingPrompt = get()._resolvePrompt;
    if (existingPrompt) {
      existingPrompt(null);
    }
    const existing = get()._resolve;
    if (existing) {
      existing(false);
    }

    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        type: "confirm",
        title: parsed.title,
        message: parsed.message,
        description: parsed.description,
        confirmText: parsed.confirmText,
        cancelText: parsed.cancelText,
        variant: parsed.variant,
        icon: parsed.icon,
        isLoading: false,
        promptValue: "",
        onConfirmAction: parsed.onConfirm,
        _resolve: resolve,
        _resolvePrompt: undefined,
      });
    });
  },

  alert: (options) => {
    const parsed = parseAlertOptions(options);

    const existingPrompt = get()._resolvePrompt;
    if (existingPrompt) {
      existingPrompt(null);
    }
    const existing = get()._resolve;
    if (existing) {
      existing(false);
    }

    return new Promise<void>((resolve) => {
      set({
        isOpen: true,
        type: "alert",
        title: parsed.title,
        message: parsed.message,
        description: parsed.description,
        confirmText: parsed.buttonText,
        cancelText: "",
        variant: parsed.variant,
        icon: parsed.icon,
        isLoading: false,
        promptValue: "",
        onConfirmAction: undefined,
        _resolve: () => resolve(),
        _resolvePrompt: undefined,
      });
    });
  },

  prompt: (options) => {
    const parsed = parsePromptOptions(options);

    const existingPrompt = get()._resolvePrompt;
    if (existingPrompt) {
      existingPrompt(null);
    }
    const existing = get()._resolve;
    if (existing) {
      existing(false);
    }

    return new Promise<string | null>((resolve) => {
      set({
        isOpen: true,
        type: "prompt",
        title: parsed.title,
        message: parsed.message,
        description: parsed.description,
        confirmText: parsed.confirmText,
        cancelText: parsed.cancelText,
        variant: parsed.variant,
        icon: parsed.icon,
        isLoading: false,
        promptValue: parsed.defaultValue,
        promptPlaceholder: parsed.placeholder,
        promptInputType: parsed.inputType,
        promptRequired: parsed.required,
        onConfirmAction: undefined,
        _resolve: undefined,
        _resolvePrompt: resolve,
      });
    });
  },

  close: (result = false) => {
    const type = get().type;
    const resolve = get()._resolve;
    const resolvePrompt = get()._resolvePrompt;
    const promptValue = get().promptValue;

    set({ isOpen: false, isLoading: false });

    if (type === "prompt" && resolvePrompt) {
      resolvePrompt(result ? promptValue : null);
    } else if (resolve) {
      resolve(result);
    }

    setTimeout(() => {
      set({
        _resolve: undefined,
        _resolvePrompt: undefined,
        onConfirmAction: undefined,
        promptValue: "",
      });
    }, 200);
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));
