import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_ROLES = ['COORDINATOR', 'COORDINATOR_MANAGER', 'ADMIN', 'SUPERADMIN'];

export async function GET() {
  const session = await auth();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const isCoordinator = session.user.role === 'COORDINATOR' || session.user.role === 'COORDINATOR_MANAGER';

  const leads = await prisma.crmLead.findMany({
    where: isCoordinator ? { coordinatorId: session.user.id } : undefined,
    include: {
      coordinator: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { firstName, lastName, phone, email, parentName, parentPhone, source, amount, description, language } = body;

  if (!firstName || !lastName) {
    return NextResponse.json({ error: 'firstName and lastName are required' }, { status: 400 });
  }

  const lead = await prisma.crmLead.create({
    data: {
      firstName,
      lastName,
      phone: phone || null,
      email: email || null,
      parentName: parentName || null,
      parentPhone: parentPhone || null,
      source: source || null,
      amount: amount ? parseFloat(amount) : null,
      description: description || null,
      language: language || null,
      coordinatorId: session.user.id,
    },
    include: {
      coordinator: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json(lead, { status: 201 });
}
