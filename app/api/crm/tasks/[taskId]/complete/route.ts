import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/crm/tasks/[taskId]/complete
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { taskId } = await params;
  const body = await request.json();
  const { comment } = body;

  try {
    // Update the task
    const task = await prisma.crmTask.update({
      where: { id: taskId },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        completedComment: comment || null,
      },
    });

    // Create a TASK_COMPLETED activity
    await prisma.crmActivity.create({
      data: {
        leadId: task.leadId,
        type: 'TASK_COMPLETED',
        content: `Задача выполнена: ${task.title}`,
        taskId: task.id,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error completing task:', error);
    return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 });
  }
}
