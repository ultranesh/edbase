import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '../components/DashboardLayout';
import ContractsList from './ContractsList';

export default async function ContractsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Only coordinators, admins and superadmins can access
  const allowedRoles: string[] = ['COORDINATOR', 'COORDINATOR_MANAGER', 'ADMIN', 'SUPERADMIN'];
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
      titleKey="contracts.title"
    >
      <ContractsList userRole={session.user.role} />
    </DashboardLayout>
  );
}
