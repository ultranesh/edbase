'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface AvatarLightboxContextType {
  openAvatar: (src: string, name?: string) => void;
}

const AvatarLightboxContext = createContext<AvatarLightboxContextType | undefined>(undefined);

export function useAvatarLightbox() {
  const context = useContext(AvatarLightboxContext);
  if (!context) {
    throw new Error('useAvatarLightbox must be used within AvatarLightboxProvider');
  }
  return context;
}

interface AvatarLightboxProviderProps {
  children: ReactNode;
}

export function AvatarLightboxProvider({ children }: AvatarLightboxProviderProps) {
  const [lightbox, setLightbox] = useState<{ src: string; name?: string } | null>(null);

  const openAvatar = useCallback((src: string, name?: string) => {
    setLightbox({ src, name });
  }, []);

  const close = useCallback(() => {
    setLightbox(null);
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [lightbox, close]);

  return (
    <AvatarLightboxContext.Provider value={{ openAvatar }}>
      {children}
      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={close}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-lightbox-backdrop" />
          <div
            className="relative animate-lightbox-zoom max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-gray-800 p-2">
              <img
                src={lightbox.src}
                alt={lightbox.name || ''}
                className="max-w-[80vw] max-h-[80vh] object-contain rounded-xl"
              />
              {lightbox.name && (
                <div className="absolute bottom-2 left-2 right-2 p-3 bg-gradient-to-t from-black/60 to-transparent rounded-b-xl">
                  <p className="text-white text-center font-medium text-lg drop-shadow">{lightbox.name}</p>
                </div>
              )}
            </div>
            <button
              onClick={close}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white dark:bg-gray-700 shadow-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </AvatarLightboxContext.Provider>
  );
}
