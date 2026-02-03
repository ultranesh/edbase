'use client';

import { ReactNode } from 'react';
import { NotificationProvider } from './ui/NotificationProvider';
import { ThemeProvider } from './ThemeProvider';
import { LanguageProvider } from './LanguageProvider';
import { AvatarLightboxProvider } from './AvatarLightbox';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <NotificationProvider>
          <AvatarLightboxProvider>
            {children}
          </AvatarLightboxProvider>
        </NotificationProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
