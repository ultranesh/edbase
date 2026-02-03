import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import DashboardLayout from '../components/DashboardLayout';
import TeachersClient from './TeachersClient';

export default async function TeachersPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // First, ensure all users with TEACHER role have a Teacher record
  const teacherUsers = await prisma.user.findMany({
    where: { role: UserRole.TEACHER },
    select: { id: true },
  });

  // Create Teacher records for users who don't have one
  for (const user of teacherUsers) {
    const existingTeacher = await prisma.teacher.findUnique({
      where: { userId: user.id },
    });
    if (!existingTeacher) {
      await prisma.teacher.create({
        data: {
          userId: user.id,
          status: 'ACTIVE',
          isActive: true,
        },
      });
    }
  }

  // Fetch all data in parallel
  const [teachers, subjects, branches, categories] = await Promise.all([
    // Fetch teachers with all relations
    prisma.teacher.findMany({
      orderBy: { user: { lastName: 'asc' } },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true,
            avatar: true,
            lastLogin: true,
            createdAt: true,
          },
        },
        category: { select: { id: true, name: true } },
        subjects: {
          include: {
            subject: { select: { id: true, nameRu: true, nameKz: true, nameEn: true } },
          },
        },
        branches: {
          include: {
            branch: { select: { id: true, name: true } },
          },
        },
      },
    }),
    // Fetch subjects for dropdown
    prisma.refSubject.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, nameRu: true, nameKz: true, nameEn: true },
    }),
    // Fetch branches for dropdown
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    // Fetch categories for dropdown
    prisma.refTeacherCategory.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <DashboardLayout
      user={{
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        iin: session.user.iin || undefined,
        role: session.user.role,
        switchToken: (session.user as any).switchToken || undefined,
      }}
      titleKey="teachers.title"
    >
      <TeachersClient
        initialTeachers={teachers}
        subjects={subjects.map(s => ({ ...s, name: s.nameRu || s.nameKz || '' }))}
        branches={branches}
        categories={categories}
        userRole={session.user.role}
      />
    </DashboardLayout>
  );
}
