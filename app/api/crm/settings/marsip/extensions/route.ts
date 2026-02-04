import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/crm/settings/marsip/extensions — list all extensions
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowedRoles = ['SUPERADMIN', 'ADMIN', 'CHIEF_COORDINATOR'];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const config = await prisma.marSipConfig.findFirst();
  if (!config) {
    return NextResponse.json([]);
  }

  const extensions = await prisma.marSipExtension.findMany({
    where: { configId: config.id },
    orderBy: { extensionNumber: 'asc' },
  });

  return NextResponse.json(extensions);
}

// POST /api/crm/settings/marsip/extensions — create new extension
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowedRoles = ['SUPERADMIN', 'ADMIN'];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { extensionNumber, displayName, userId } = body;

  if (!extensionNumber) {
    return NextResponse.json({ error: 'Extension number is required' }, { status: 400 });
  }

  // Get or create config
  let config = await prisma.marSipConfig.findFirst();
  if (!config) {
    config = await prisma.marSipConfig.create({
      data: {
        sipServer: 'almpbx.tele2.kz',
        sipPort: 5060,
        isActive: false,
      },
    });
  }

  // Check if extension already exists
  const existing = await prisma.marSipExtension.findUnique({
    where: {
      configId_extensionNumber: {
        configId: config.id,
        extensionNumber,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ error: 'Extension number already exists' }, { status: 400 });
  }

  // Check if user is already assigned to another extension
  if (userId) {
    const userExtension = await prisma.marSipExtension.findUnique({
      where: { userId },
    });
    if (userExtension) {
      return NextResponse.json({ error: 'User is already assigned to another extension' }, { status: 400 });
    }
  }

  const extension = await prisma.marSipExtension.create({
    data: {
      configId: config.id,
      extensionNumber,
      displayName,
      userId: userId || null,
      isActive: true,
    },
  });

  return NextResponse.json(extension);
}

// DELETE /api/crm/settings/marsip/extensions — delete extension (by id in body)
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowedRoles = ['SUPERADMIN', 'ADMIN'];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: 'Extension ID is required' }, { status: 400 });
  }

  await prisma.marSipExtension.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}

// PUT /api/crm/settings/marsip/extensions — update extension
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
  const { id, extensionNumber, displayName, userId, isActive, forwardNumber, voicemailEnabled } = body;

  if (!id) {
    return NextResponse.json({ error: 'Extension ID is required' }, { status: 400 });
  }

  // Check if user is already assigned to another extension
  if (userId) {
    const userExtension = await prisma.marSipExtension.findUnique({
      where: { userId },
    });
    if (userExtension && userExtension.id !== id) {
      return NextResponse.json({ error: 'User is already assigned to another extension' }, { status: 400 });
    }
  }

  const extension = await prisma.marSipExtension.update({
    where: { id },
    data: {
      extensionNumber,
      displayName,
      userId: userId || null,
      isActive,
      forwardNumber,
      voicemailEnabled,
    },
  });

  return NextResponse.json(extension);
}
