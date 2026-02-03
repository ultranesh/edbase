'use client';

import { useEffect, useState } from 'react';

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 8000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));

    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const styles = {
    success: 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-700',
    error: 'bg-white dark:bg-gray-800 border-red-200 dark:border-red-700',
    warning: 'bg-white dark:bg-gray-800 border-amber-200 dark:border-amber-700',
    info: 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700',
  };

  const iconStyles = {
    success: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
    error: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    info: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
  };

  const textStyles = {
    success: 'text-green-800 dark:text-green-300',
    error: 'text-red-800 dark:text-red-300',
    warning: 'text-amber-800 dark:text-amber-300',
    info: 'text-blue-800 dark:text-blue-300',
  };

  // Parse message - split by comma for multi-line display
  const formatMessage = (msg: string) => {
    // Check if message has a prefix like "Внимание: " or "Ошибка: "
    const prefixMatch = msg.match(/^([^:]+):\s*/);
    let prefix = '';
    let content = msg;

    if (prefixMatch) {
      prefix = prefixMatch[1];
      content = msg.slice(prefixMatch[0].length);
    }

    // Split by comma
    const parts = content.split(',').map(p => p.trim()).filter(Boolean);

    if (parts.length <= 1 && !prefix) {
      return <span>{msg}</span>;
    }

    return (
      <div className="flex flex-col gap-1">
        {prefix && <span className="font-semibold">{prefix}:</span>}
        {parts.map((part, idx) => (
          <span key={idx} className="block">• {part}</span>
        ))}
      </div>
    );
  };

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 min-w-[320px] max-w-lg rounded-2xl border shadow-xl
        transition-all duration-300 ease-out
        ${styles[type]}
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}
      `}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${iconStyles[type]}`}>
        {icons[type]}
      </div>
      <div className={`text-sm font-medium flex-1 ${textStyles[type]}`}>
        {formatMessage(message)}
      </div>
      <button
        onClick={() => {
          setIsLeaving(true);
          setTimeout(onClose, 300);
        }}
        className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
