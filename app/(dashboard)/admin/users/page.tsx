import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import UsersClient from './UsersClient';
import DashboardLayout from '../../components/DashboardLayout';

export default async function AdminUsersPage() {
  const session = await auth();

  // Check if user is authenticated and has admin rights
  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPERADMIN) {
    redirect('/dashboard');
  }

  // Fetch all users
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      iin: true,
      firstName: true,
      lastName: true,
      role: true,
      avatar: true,
      isActive: true,
      phone: true,
      sipNumber: true,
      lastLogin: true,
      lastSeen: true,
      createdAt: true,
    },
  });

  return (
    <DashboardLayout
      user={{
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        iin: session.user.iin || undefined,
        role: session.user.role,
        switchToken: (session.user as any).switchToken || undefined,
      }}
    >
      <UsersClient initialUsers={users} currentUserRole={session.user.role} currentUserId={session.user.id} />
    </DashboardLayout>
  );
}
