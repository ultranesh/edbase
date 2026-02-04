import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '../components/DashboardLayout';
import CrmClient from './CrmClient';
import MarSipHeaderWidget from './components/MarSipHeaderWidget';

export default async function CrmPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const allowedRoles: string[] = ['COORDINATOR', 'CHIEF_COORDINATOR', 'ADMIN', 'SUPERADMIN'];
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/dashboard');
  }

  const isCoordinator = session.user.role === 'COORDINATOR' || session.user.role === 'CHIEF_COORDINATOR';

  const leads = await prisma.crmLead.findMany({
    where: isCoordinator ? { coordinatorId: session.user.id } : undefined,
    include: {
      coordinator: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const coordinators = await prisma.user.findMany({
    where: { role: { in: ['COORDINATOR', 'CHIEF_COORDINATOR'] }, isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { lastName: 'asc' },
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
      titleKey="crm.title"
      titleActions={<MarSipHeaderWidget />}
    >
      <CrmClient
        initialLeads={JSON.parse(JSON.stringify(leads))}
        userRole={session.user.role}
        userId={session.user.id}
        coordinators={coordinators.map(c => ({ id: c.id, name: `${c.lastName} ${c.firstName}` }))}
      />
    </DashboardLayout>
  );
}
