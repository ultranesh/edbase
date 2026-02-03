import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '../components/DashboardLayout';
import MyTestsClient from './MyTestsClient';

export default async function MyTestsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
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
      titleKey="myTests.title"
    >
      <MyTestsClient />
    </DashboardLayout>
  );
}
