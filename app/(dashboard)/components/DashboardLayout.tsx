'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import UserMenu from './UserMenu';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageToggle from '../../components/LanguageToggle';
import { useLanguage } from '../../components/LanguageProvider';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: {
    firstName: string;
    lastName: string;
    iin?: string;
    role: string;
    switchToken?: string;
  };
  title?: string;
  titleKey?: string;
  titleActions?: React.ReactNode;
  rightActions?: React.ReactNode;
}

export default function DashboardLayout({
  children,
  user,
  title,
  titleKey,
  titleActions,
  rightActions,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useLanguage();

  // Use titleKey for translation if provided, otherwise use title directly
  const displayTitle = titleKey ? t(titleKey) : title;

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        userRole={user.role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Title and title actions - shown on desktop */}
          <div className="hidden lg:flex items-center gap-4">
            {displayTitle && (
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{displayTitle}</h1>
            )}
            {titleActions}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 ml-auto">
            {rightActions}
            <LanguageToggle />
            <ThemeToggle />
            <UserMenu
              firstName={user.firstName}
              lastName={user.lastName}
              iin={user.iin}
              role={user.role}
              switchToken={user.switchToken}
            />
          </div>
        </header>

        {/* Page Content - scrollable */}
        <main className="flex-1 overflow-y-auto overscroll-none bg-gray-50 dark:bg-gray-900 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
