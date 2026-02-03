import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import DatabaseClient from './DatabaseClient';

export default async function DatabaseSettingsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Only ADMIN and SUPERADMIN can access database settings
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
    redirect('/dashboard');
  }

  return (
    <DashboardLayout
      user={{
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        iin: session.user.iin || undefined,
        role: session.user.role,
        switchToken: (session.user as any).switchToken || undefined,
      }}
      titleKey="database.title"
    >
      <DatabaseClient userRole={session.user.role} />
    </DashboardLayout>
  );
}
