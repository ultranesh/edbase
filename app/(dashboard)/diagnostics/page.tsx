import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '../components/DashboardLayout';
import MyTestsClient from '../my-tests/MyTestsClient';

export default async function DiagnosticsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Only coordinators and above can access
  const canAccess = ['COORDINATOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.role);
  if (!canAccess) {
    redirect('/dashboard');
  }

  return (
    <DashboardLayout
      user={{
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        email: session.user.email,
        role: session.user.role,
      }}
      title="Диагностика знаний"
    >
      <MyTestsClient isDiagnostic={true} />
    </DashboardLayout>
  );
}
