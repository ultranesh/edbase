'use client';

import { useEffect, useState, useRef } from 'react';
import { useLanguage } from '../../components/LanguageProvider';

export interface PromptDialogProps {
  title: string;
  message: string;
  placeholder?: string;
  inputType?: 'text' | 'number';
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function PromptDialog({
  title,
  message,
  placeholder = '',
  inputType = 'text',
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const { t } = useLanguage();
  const finalConfirmText = confirmText || t('common.confirm');
  const finalCancelText = cancelText || t('common.cancel');
  const [isVisible, setIsVisible] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    // Focus input after animation
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleClose = (confirmed: boolean) => {
    setIsVisible(false);
    setTimeout(() => {
      if (confirmed && value.trim()) {
        onConfirm(value.trim());
      } else {
        onCancel();
      }
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      handleClose(true);
    } else if (e.key === 'Escape') {
      handleClose(false);
    }
  };

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        transition-all duration-200
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => handleClose(false)}
      />

      {/* Dialog */}
      <div
        className={`
          relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6
          transition-all duration-200
          ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
        `}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div className="flex-1 pt-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
            <input
              ref={inputRef}
              type={inputType}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              autoComplete="off"
              className="mt-4 w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={() => handleClose(false)}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {finalCancelText}
          </button>
          <button
            onClick={() => handleClose(true)}
            disabled={!value.trim()}
            className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {finalConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
