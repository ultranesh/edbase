import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/crm/settings/marsip — get MarSIP configuration
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Allow coordinators to get config for making calls
  const allowedRoles = ['SUPERADMIN', 'ADMIN', 'CHIEF_COORDINATOR', 'COORDINATOR'];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get or create default config
  let config = await prisma.marSipConfig.findFirst({
    include: {
      extensions: {
        orderBy: { extensionNumber: 'asc' },
      },
    },
  });

  if (!config) {
    // Create default config (not active by default)
    config = await prisma.marSipConfig.create({
      data: {
        sipServer: 'almpbx.tele2.kz',
        sipPort: 5060,
        isActive: false,
        recordCalls: true,
        autoCreateLead: true,
        showLeadCard: true,
        logCallsToLead: true,
        ringTimeout: 30,
        voicemailEnabled: false,
      },
      include: {
        extensions: {
          orderBy: { extensionNumber: 'asc' },
        },
      },
    });
  }

  return NextResponse.json(config);
}

// PUT /api/crm/settings/marsip — update MarSIP configuration
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowedRoles = ['SUPERADMIN', 'ADMIN'];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();

  // Get existing config
  let config = await prisma.marSipConfig.findFirst();

  if (!config) {
    // Create new config
    config = await prisma.marSipConfig.create({
      data: {
        sipServer: body.sipServer || 'almpbx.tele2.kz',
        sipLogin: body.sipLogin,
        sipPassword: body.sipPassword,
        sipPort: body.sipPort || 5060,
        isActive: body.isActive ?? false,
        recordCalls: body.recordCalls ?? true,
        autoCreateLead: body.autoCreateLead ?? true,
        showLeadCard: body.showLeadCard ?? true,
        logCallsToLead: body.logCallsToLead ?? true,
        ringTimeout: body.ringTimeout || 30,
        forwardNumber: body.forwardNumber,
        voicemailEnabled: body.voicemailEnabled ?? false,
      },
      include: {
        extensions: {
          orderBy: { extensionNumber: 'asc' },
        },
      },
    });
  } else {
    // Update existing config
    config = await prisma.marSipConfig.update({
      where: { id: config.id },
      data: {
        sipServer: body.sipServer,
        sipLogin: body.sipLogin,
        sipPassword: body.sipPassword,
        sipPort: body.sipPort,
        isActive: body.isActive,
        recordCalls: body.recordCalls,
        autoCreateLead: body.autoCreateLead,
        showLeadCard: body.showLeadCard,
        logCallsToLead: body.logCallsToLead,
        ringTimeout: body.ringTimeout,
        forwardNumber: body.forwardNumber,
        voicemailEnabled: body.voicemailEnabled,
      },
      include: {
        extensions: {
          orderBy: { extensionNumber: 'asc' },
        },
      },
    });
  }

  return NextResponse.json(config);
}
