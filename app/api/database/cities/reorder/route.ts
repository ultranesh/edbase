import { prisma } from '@/lib/prisma';
import { handleReorder } from '@/lib/reorderHandler';

export async function POST(request: Request) {
  return handleReorder(request, prisma.refCity);
}
