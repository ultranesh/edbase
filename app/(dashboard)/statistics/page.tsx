import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '../components/DashboardLayout';
import StatisticsClient from './StatisticsClient';

export default async function StatisticsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const allowedRoles: string[] = ['COORDINATOR', 'CHIEF_COORDINATOR', 'ADMIN', 'SUPERADMIN'];
  if (!allowedRoles.includes(session.user.role)) {
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
      titleKey="statistics.title"
    >
      <StatisticsClient
        userRole={session.user.role}
        userId={session.user.id}
      />
    </DashboardLayout>
  );
}
