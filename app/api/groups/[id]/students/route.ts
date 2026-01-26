import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// POST - Add student to group
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: groupId } = await params;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles: UserRole[] = [UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPERADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { studentId } = await request.json();

    // Check if group exists and has capacity
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: { students: true },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (group._count.students >= group.maxStudents) {
      return NextResponse.json(
        { error: 'Group is full' },
        { status: 400 }
      );
    }

    // Check if student already in group
    const existing = await prisma.groupStudent.findUnique({
      where: {
        groupId_studentId: {
          groupId,
          studentId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Student already in group' },
        { status: 400 }
      );
    }

    const groupStudent = await prisma.groupStudent.create({
      data: {
        groupId,
        studentId,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(groupStudent);
  } catch (error) {
    console.error('Add student to group error:', error);
    return NextResponse.json(
      { error: 'Failed to add student to group' },
      { status: 500 }
    );
  }
}

// DELETE - Remove student from group
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: groupId } = await params;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles: UserRole[] = [UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPERADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    await prisma.groupStudent.delete({
      where: {
        groupId_studentId: {
          groupId,
          studentId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove student from group error:', error);
    return NextResponse.json(
      { error: 'Failed to remove student from group' },
      { status: 500 }
    );
  }
}
