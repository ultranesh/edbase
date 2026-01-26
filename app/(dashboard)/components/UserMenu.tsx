'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';

interface UserMenuProps {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const roleLabels: Record<string, string> = {
  SUPERADMIN: 'Суперадмин',
  ADMIN: 'Администратор',
  COORDINATOR: 'Координатор',
  TEACHER: 'Преподаватель',
  STUDENT: 'Ученик',
};

export default function UserMenu({ firstName, lastName, email, role }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-gray-100 transition-all"
      >
        <span className="text-sm text-gray-700 hidden sm:block">
          {firstName} {lastName}
        </span>
        <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center">
          <span className="text-sm font-medium text-white">
            {firstName?.[0] || ''}{lastName?.[0] || ''}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-lg border border-gray-200 py-2 z-50 animate-fade-in">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">
              {firstName} {lastName}
            </p>
            <p className="text-xs text-gray-500 mt-1">{email}</p>
            <span className="inline-block mt-2 px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg">
              {roleLabels[role] || role}
            </span>
          </div>

          <div className="p-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-medium">Выйти из системы</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
