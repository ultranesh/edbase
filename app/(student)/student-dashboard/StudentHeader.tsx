'use client';

import { ReactNode } from 'react';
import UserMenu from '@/app/(dashboard)/components/UserMenu';

interface StudentHeaderProps {
  firstName: string;
  lastName: string;
  iin?: string;
  role: string;
  switchToken?: string;
  statusBadge: ReactNode;
}

export default function StudentHeader({ firstName, lastName, iin, role, switchToken, statusBadge }: StudentHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {firstName} {lastName}
            </h1>
            {statusBadge}
          </div>
          <UserMenu
            firstName={firstName}
            lastName={lastName}
            iin={iin}
            role={role}
            switchToken={switchToken}
          />
        </div>
      </div>
    </header>
  );
}
