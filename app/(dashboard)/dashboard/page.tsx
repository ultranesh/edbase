import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardWrapper from './DashboardWrapper';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <DashboardWrapper
      user={{
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        iin: session.user.iin || undefined,
        role: session.user.role,
        switchToken: (session.user as any).switchToken || undefined,
      }}
    />
  );
}
