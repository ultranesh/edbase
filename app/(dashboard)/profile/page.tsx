import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '../components/DashboardLayout';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      iin: true,
      firstName: true,
      lastName: true,
      middleName: true,
      phone: true,
      role: true,
      avatar: true,
      pin: true,
      avatarLocked: true,
      isActive: true,
      createdAt: true,
      lastLogin: true,
      student: {
        select: {
          id: true,
          balance: true,
          totalEarned: true,
          status: true,
          dateOfBirth: true,
          gradeLevel: { select: { name: true } },
          language: { select: { name: true } },
          studyDirection: { select: { name: true } },
          school: { select: { name: true } },
          city: { select: { name: true } },
          branch: { select: { name: true } },
        },
      },
      teacher: {
        select: {
          id: true,
          status: true,
          experience: true,
          bio: true,
          dateOfBirth: true,
          category: { select: { name: true } },
          subjects: { select: { subject: { select: { nameRu: true, nameKz: true } } } },
        },
      },
      parent: { select: { id: true, occupation: true } },
    },
  });

  if (!user) {
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
      titleKey="profile.title"
    >
      <ProfileClient
        initialUser={{
          ...user,
          hasPin: !!user.pin,
          pin: undefined,
          createdAt: user.createdAt.toISOString(),
          lastLogin: user.lastLogin?.toISOString() || null,
          student: user.student
            ? {
                ...user.student,
                dateOfBirth: user.student.dateOfBirth?.toISOString() || null,
              }
            : null,
          teacher: user.teacher
            ? {
                ...user.teacher,
                dateOfBirth: user.teacher.dateOfBirth?.toISOString() || null,
              }
            : null,
        }}
      />
    </DashboardLayout>
  );
}
