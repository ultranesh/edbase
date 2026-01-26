import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, TaskFormat, DifficultyLevel } from '@prisma/client';

// GET - Fetch tasks with filters
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subtopicId = searchParams.get('subtopicId');
    const topicId = searchParams.get('topicId');
    const subjectId = searchParams.get('subjectId');
    const format = searchParams.get('format') as TaskFormat | null;
    const difficulty = searchParams.get('difficulty') as DifficultyLevel | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = { isActive: true };

    if (subtopicId) {
      where.subtopicId = subtopicId;
    } else if (topicId) {
      where.subtopic = {
        topicId,
      };
    } else if (subjectId) {
      where.subtopic = {
        topic: {
          subjectId,
        },
      };
    }

    if (format) {
      where.format = format;
    }

    if (difficulty) {
      where.difficultyLevel = difficulty;
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      }),
      prisma.task.count({ where }),
    ]);

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST - Create new task
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Teachers, Coordinators, Admins can create tasks
    const allowedRoles: UserRole[] = [UserRole.TEACHER, UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPERADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();

    // Support both single subtopicId and multiple subtopicIds
    const subtopicIds: string[] = data.subtopicIds || (data.subtopicId ? [data.subtopicId] : []);

    if (subtopicIds.length === 0) {
      return NextResponse.json({ error: 'At least one subtopic is required' }, { status: 400 });
    }

    // Create task with subtopic links in a transaction
    const task = await prisma.$transaction(async (tx) => {
      // Create the task
      const newTask = await tx.task.create({
        data: {
          subtopicId: subtopicIds[0], // Primary subtopic for backward compatibility
          format: data.format,
          difficultyLevel: data.difficultyLevel,
          questionText: data.questionText,
          questionImage: data.questionImage,
          answerText: data.answerText,
          answerImage: data.answerImage,
          solutionText: data.solutionText,
          solutionImage: data.solutionImage,
          hints: data.hints || [],
          tags: data.tags || [],
          points: data.points || 1,
          timeEstimate: data.timeEstimate,
          createdBy: session.user.id,
          isActive: true,
        },
      });

      // Create subtopic links for all selected subtopics
      await tx.taskSubtopicLink.createMany({
        data: subtopicIds.map((subtopicId: string) => ({
          taskId: newTask.id,
          subtopicId,
        })),
      });

      // Return task with all relations
      return tx.task.findUnique({
        where: { id: newTask.id },
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
    console.error('Create task error:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
