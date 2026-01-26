import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// GET - Get single task
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        subtopic: {
          include: {
            topic: {
              include: {
                subject: true,
              },
            },
          },
        },
        subtopics: {
          include: {
            subtopic: {
              include: {
                topic: {
                  include: {
                    subject: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// PATCH - Update task
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles: UserRole[] = [UserRole.TEACHER, UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPERADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();

    // Support both single subtopicId and multiple subtopicIds
    const subtopicIds: string[] = data.subtopicIds || (data.subtopicId ? [data.subtopicId] : []);

    // Update task and subtopic links in a transaction
    const task = await prisma.$transaction(async (tx) => {
      // Update the task
      await tx.task.update({
        where: { id },
        data: {
          subtopicId: subtopicIds.length > 0 ? subtopicIds[0] : data.subtopicId, // Primary subtopic
          format: data.format,
          difficultyLevel: data.difficultyLevel,
          questionText: data.questionText,
          questionImage: data.questionImage,
          answerText: data.answerText,
          answerImage: data.answerImage,
          solutionText: data.solutionText,
          solutionImage: data.solutionImage,
          hints: data.hints,
          tags: data.tags,
          points: data.points,
          timeEstimate: data.timeEstimate,
          isActive: data.isActive,
        },
      });

      // If subtopicIds provided, update the links
      if (subtopicIds.length > 0) {
        // Delete existing links
        await tx.taskSubtopicLink.deleteMany({
          where: { taskId: id },
        });

        // Create new links
        await tx.taskSubtopicLink.createMany({
          data: subtopicIds.map((subtopicId: string) => ({
            taskId: id,
            subtopicId,
          })),
        });
      }

      // Return task with all relations
      return tx.task.findUnique({
        where: { id },
        include: {
          subtopic: {
            include: {
              topic: {
                include: {
                  subject: true,
                },
              },
            },
          },
          subtopics: {
            include: {
              subtopic: {
                include: {
                  topic: {
                    include: {
                      subject: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE - Delete task
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and SUPERADMIN can delete tasks
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: 'Forbidden. Only ADMIN can delete tasks' }, { status: 403 });
    }

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
