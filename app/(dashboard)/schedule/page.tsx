import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '../components/DashboardLayout';
import ScheduleClient from './ScheduleClient';

export default async function SchedulePage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const [branches, scheduleSlots] = await Promise.all([
    prisma.branch.findMany({
      where: { isActive: true },
      include: {
        classrooms: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.scheduleSlot.findMany({
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
      include: {
        branch: true,
        classroom: true,
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                middleName: true,
              },
            },
          },
        },
        group: {
          include: {
            course: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return (
    <DashboardLayout
      user={{
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        email: session.user.email,
        role: session.user.role,
      }}
      title="Расписание"
    >
      <ScheduleClient
        branches={branches}
        initialSlots={scheduleSlots}
        userRole={session.user.role}
      />
    </DashboardLayout>
  );
}
