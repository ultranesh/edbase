import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_ROLES = ['COORDINATOR', 'CHIEF_COORDINATOR', 'ADMIN', 'SUPERADMIN'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.firstName !== undefined) data.firstName = body.firstName;
  if (body.lastName !== undefined) data.lastName = body.lastName;
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.email !== undefined) data.email = body.email || null;
  if (body.parentName !== undefined) data.parentName = body.parentName || null;
  if (body.parentPhone !== undefined) data.parentPhone = body.parentPhone || null;
  if (body.source !== undefined) data.source = body.source || null;
  // Handle stage - if it's a UUID (36 chars), use stageId; otherwise use legacy stage enum
  if (body.stage !== undefined) {
    if (body.stage && body.stage.length === 36 && body.stage.includes('-')) {
      data.stageId = body.stage;
    } else {
      data.stage = body.stage;
    }
  }
  if (body.stageId !== undefined) data.stageId = body.stageId || null;
  if (body.funnelId !== undefined) data.funnelId = body.funnelId || null;
  if (body.amount !== undefined) data.amount = body.amount ? parseFloat(body.amount) : null;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.lostReason !== undefined) data.lostReason = body.lostReason || null;
  if (body.coordinatorId !== undefined) data.coordinatorId = body.coordinatorId || null;
  if (body.language !== undefined) data.language = body.language || null;

  const lead = await prisma.crmLead.update({
    where: { id },
    data,
    include: {
      coordinator: { select: { firstName: true, lastName: true } },
      stage_rel: true,
      funnel: true,
    },
  });

  return NextResponse.json(lead);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  await prisma.crmLead.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
