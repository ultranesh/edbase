'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';
import PromptDialog from './PromptDialog';

interface ToastOptions {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface PromptOptions {
  title: string;
  message: string;
  placeholder?: string;
  inputType?: 'text' | 'number';
  confirmText?: string;
  cancelText?: string;
}

interface NotificationContextType {
  showToast: (options: ToastOptions) => void;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  showPrompt: (options: PromptOptions) => Promise<string | null>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [toasts, setToasts] = useState<(ToastOptions & { id: number })[]>([]);
  const [confirm, setConfirm] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);
  const [prompt, setPrompt] = useState<(PromptOptions & { resolve: (value: string | null) => void }) | null>(null);

  const showToast = useCallback((options: ToastOptions) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...options, id }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirm({ ...options, resolve });
    });
  }, []);

  const handleConfirmClose = useCallback((confirmed: boolean) => {
    if (confirm) {
      confirm.resolve(confirmed);
      setConfirm(null);
    }
  }, [confirm]);

  const showPrompt = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise(resolve => {
      setPrompt({ ...options, resolve });
    });
  }, []);

  const handlePromptClose = useCallback((value: string | null) => {
    if (prompt) {
      prompt.resolve(value);
      setPrompt(null);
    }
  }, [prompt]);

  return (
    <NotificationContext.Provider value={{ showToast, showConfirm, showPrompt }}>
      {children}

      {/* Toasts */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Confirm Dialog */}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmText={confirm.confirmText}
          cancelText={confirm.cancelText}
          type={confirm.type}
          onConfirm={() => handleConfirmClose(true)}
          onCancel={() => handleConfirmClose(false)}
        />
      )}

      {/* Prompt Dialog */}
      {prompt && (
        <PromptDialog
          title={prompt.title}
          message={prompt.message}
          placeholder={prompt.placeholder}
          inputType={prompt.inputType}
          confirmText={prompt.confirmText}
          cancelText={prompt.cancelText}
          onConfirm={(value) => handlePromptClose(value)}
          onCancel={() => handlePromptClose(null)}
        />
      )}
    </NotificationContext.Provider>
  );
}
