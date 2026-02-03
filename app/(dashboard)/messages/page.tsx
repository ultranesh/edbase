import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '../components/DashboardLayout';
import MessagesClient from './MessagesClient';

export default async function MessagesPage() {
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
      titleKey="nav.messages"
    >
      <MessagesClient
        currentUserId={session.user.id}
        currentUserName={`${session.user.firstName} ${session.user.lastName}`}
        currentUserRole={session.user.role}
      />
    </DashboardLayout>
  );
}
