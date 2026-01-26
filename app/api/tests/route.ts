import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';

// POST - Create new test
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isTeacher = session.user.role === UserRole.TEACHER ||
                      session.user.role === UserRole.ADMIN ||
                      session.user.role === UserRole.SUPERADMIN;

    if (!isTeacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      type,
      groupId,
      duration,
      totalScore,
      passingScore,
      startDate,
      endDate,
      isActive,
      questionIds, // Array of TaskBank IDs
    } = body;

    // Validate required fields
    if (!title || !groupId || !type || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create test with questions
    const test = await prisma.test.create({
      data: {
        title,
        description,
        type,
        groupId,
        createdById: session.user.id,
        duration: duration || 60,
        totalScore: totalScore || 100,
        passingScore: passingScore || 60,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive ?? true,
        questions: questionIds ? {
          create: questionIds.map((taskId: string, index: number) => ({
            taskId,
            orderIndex: index,
            points: 1,
          })),
        } : undefined,
      },
      include: {
        questions: true,
        group: true,
      },
    });

    return NextResponse.json(test, { status: 201 });
  } catch (error) {
    console.error('Error creating test:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
