import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import DashboardLayout from '../components/DashboardLayout';
import EnrollmentForm from './EnrollmentForm';

export default async function EnrollmentPage() {
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
      titleKey="enrollment.title"
    >
      <div className="mb-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Заполните форму для зачисления нового ученика. После отправки заявка попадет куратору на подтверждение.
        </p>
      </div>

      <EnrollmentForm coordinatorId={session.user.id} userRole={session.user.role} />
    </DashboardLayout>
  );
}
