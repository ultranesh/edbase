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
  const allowedRoles: string[] = ['COORDINATOR', 'ADMIN', 'SUPERADMIN'];
  if (!allowedRoles.includes(session.user.role)) {
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
      title="Договоры"
    >
      <div className="space-y-6">
        <p className="text-sm text-gray-600">
          Список договоров учеников. Вы можете скачать договор в формате PDF.
        </p>

        <ContractsList />
      </div>
    </DashboardLayout>
  );
}
