import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/crm/leads/[id]/activities
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: leadId } = await params;

  try {
    const activities = await prisma.crmActivity.findMany({
      where: { leadId },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        note: true,
        task: {
          include: {
            assignee: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

// POST /api/crm/leads/[id]/activities
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: leadId } = await params;
  const body = await request.json();
  const { type, content, taskTitle, taskType, dueDate } = body;

  try {
    if (type === 'NOTE') {
      // Create note and activity
      const note = await prisma.crmNote.create({
        data: {
          leadId,
          content: content || '',
          createdById: session.user.id,
        },
      });

      const activity = await prisma.crmActivity.create({
        data: {
          leadId,
          type: 'NOTE',
          content: content || '',
          noteId: note.id,
          createdById: session.user.id,
        },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          note: true,
        },
      });

      return NextResponse.json(activity);
    }

    if (type === 'TASK') {
      // Create task and activity
      const task = await prisma.crmTask.create({
        data: {
          leadId,
          title: taskTitle || 'Задача',
          taskType: taskType || 'CALL',
          dueDate: dueDate ? new Date(dueDate) : null,
          createdById: session.user.id,
          assigneeId: session.user.id, // Assign to creator by default
        },
      });

      const activity = await prisma.crmActivity.create({
        data: {
          leadId,
          type: 'TASK',
          content: taskTitle,
          taskId: task.id,
          createdById: session.user.id,
        },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          task: {
            include: {
              assignee: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });

      return NextResponse.json(activity);
    }

    return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}
