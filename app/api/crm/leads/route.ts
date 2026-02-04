import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_ROLES = ['COORDINATOR', 'CHIEF_COORDINATOR', 'ADMIN', 'SUPERADMIN'];

export async function GET() {
  const session = await auth();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const isCoordinator = session.user.role === 'COORDINATOR' || session.user.role === 'CHIEF_COORDINATOR';

  const leads = await prisma.crmLead.findMany({
    where: isCoordinator ? { coordinatorId: session.user.id } : undefined,
    include: {
      coordinator: { select: { firstName: true, lastName: true } },
      stage_rel: true,
      funnel: true,
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
  const { firstName, lastName, phone, email, parentName, parentPhone, source, amount, description, language, funnelId, stageId } = body;

  if (!firstName || !lastName) {
    return NextResponse.json({ error: 'firstName and lastName are required' }, { status: 400 });
  }

  // Get funnel and stage
  let targetFunnelId = funnelId;
  let targetStageId = stageId;

  if (!targetFunnelId) {
    // Find default funnel or first active funnel
    const defaultFunnel = await prisma.crmFunnel.findFirst({
      where: { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { order: 'asc' }],
      include: { stages: { orderBy: { order: 'asc' }, take: 1 } },
    });

    if (defaultFunnel) {
      targetFunnelId = defaultFunnel.id;
      // Get first stage (Новая заявка)
      if (!targetStageId && defaultFunnel.stages.length > 0) {
        targetStageId = defaultFunnel.stages[0].id;
      }
    }
  } else if (!targetStageId) {
    // Funnel provided but no stage - get first stage
    const firstStage = await prisma.crmStage.findFirst({
      where: { funnelId: targetFunnelId },
      orderBy: { order: 'asc' },
    });
    if (firstStage) {
      targetStageId = firstStage.id;
    }
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
      funnelId: targetFunnelId || null,
      stageId: targetStageId || null,
    },
    include: {
      coordinator: { select: { firstName: true, lastName: true } },
      stage_rel: true,
      funnel: true,
    },
  });

  return NextResponse.json(lead, { status: 201 });
}
