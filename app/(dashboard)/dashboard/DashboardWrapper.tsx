'use client';

import DashboardLayout from '../components/DashboardLayout';
import DashboardContent from './DashboardContent';

interface DashboardWrapperProps {
  user: {
    firstName: string;
    lastName: string;
    iin?: string;
    role: string;
    switchToken?: string;
  };
}

export default function DashboardWrapper({ user }: DashboardWrapperProps) {
  return (
    <DashboardLayout user={user} titleKey="nav.dashboard">
      <DashboardContent firstName={user.firstName} role={user.role} />
    </DashboardLayout>
  );
}
