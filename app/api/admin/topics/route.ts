import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// GET - Fetch all topics for a subject
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');

    const where = subjectId ? { subjectId } : {};

    const topics = await prisma.taskTopic.findMany({
      where,
      orderBy: { orderIndex: 'asc' },
      include: {
        subtopics: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return NextResponse.json(topics);
  } catch (error) {
    console.error('Get topics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}

// POST - Create new topic
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();

    // Get max order index for this subject
    const maxOrder = await prisma.taskTopic.findFirst({
      where: { subjectId: data.subjectId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    const topic = await prisma.taskTopic.create({
      data: {
        subjectId: data.subjectId,
        name: data.name,
        nameRu: data.nameRu,
        nameKz: data.nameKz,
        nameEn: data.nameEn,
        icon: data.icon,
        orderIndex: (maxOrder?.orderIndex || 0) + 1,
        isActive: true,
      },
      include: {
        subtopics: true,
      },
    });

    return NextResponse.json(topic);
  } catch (error) {
    console.error('Create topic error:', error);
    return NextResponse.json(
      { error: 'Failed to create topic' },
      { status: 500 }
    );
  }
}
