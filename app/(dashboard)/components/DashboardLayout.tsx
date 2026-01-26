'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import UserMenu from './UserMenu';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  title?: string;
  rightActions?: React.ReactNode;
}

export default function DashboardLayout({
  children,
  user,
  title,
  rightActions,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 bg-white border-b border-gray-200 shrink-0">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Title - shown on desktop */}
          {title && (
            <h1 className="hidden lg:block text-xl font-semibold text-gray-900">{title}</h1>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3 ml-auto">
            {rightActions}
            <UserMenu
              firstName={user.firstName}
              lastName={user.lastName}
              email={user.email}
              role={user.role}
            />
          </div>
        </header>

        {/* Page Content - scrollable */}
        <main className="flex-1 overflow-y-auto overscroll-none bg-gray-50 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
