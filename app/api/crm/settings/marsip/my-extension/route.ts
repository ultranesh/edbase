import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/crm/settings/marsip/my-extension — check if current user has extension
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await prisma.marSipConfig.findFirst();
  if (!config || !config.isActive) {
    return NextResponse.json({ hasExtension: false, marsipActive: false });
  }

  const extension = await prisma.marSipExtension.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({
    hasExtension: !!extension,
    marsipActive: true,
    extension: extension ? {
      extensionNumber: extension.extensionNumber,
      displayName: extension.displayName,
      isActive: extension.isActive,
    } : null,
  });
}
