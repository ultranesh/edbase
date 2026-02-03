import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, TeacherStatus, SalaryFormat } from '@prisma/client';

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

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            email: true,
            phone: true,
          },
        },
        category: { select: { id: true, name: true } },
        subjects: {
          include: {
            subject: { select: { id: true, nameRu: true, nameKz: true } },
          },
        },
        branches: {
          include: {
            branch: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(teacher);
  } catch (error) {
    console.error('Get teacher error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teacher' },
      { status: 500 }
    );
  }
}

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

    // Check if user is admin or superadmin
    const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.COORDINATOR];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();

    // Fetch current teacher to get userId
    const currentTeacher = await prisma.teacher.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!currentTeacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Update user data if provided
    if (data.firstName || data.lastName || data.middleName || data.email || data.userPhone) {
      await prisma.user.update({
        where: { id: currentTeacher.userId },
        data: {
          ...(data.firstName && { firstName: data.firstName }),
          ...(data.lastName && { lastName: data.lastName }),
          ...(data.middleName !== undefined && { middleName: data.middleName || null }),
          ...(data.email && { email: data.email }),
          ...(data.userPhone !== undefined && { phone: data.userPhone || null }),
        },
      });
    }

    // Prepare teacher update data
    const teacherUpdateData: Record<string, unknown> = {};

    if (data.dateOfBirth !== undefined) {
      teacherUpdateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    }
    if (data.iin !== undefined) {
      teacherUpdateData.iin = data.iin || null;
    }
    if (data.phone !== undefined) {
      teacherUpdateData.phone = data.phone || null;
    }
    if (data.categoryId !== undefined) {
      teacherUpdateData.categoryId = data.categoryId || null;
    }
    if (data.status !== undefined) {
      teacherUpdateData.status = data.status as TeacherStatus;
    }
    if (data.isActive !== undefined) {
      teacherUpdateData.isActive = data.isActive;
    }
    if (data.bio !== undefined) {
      teacherUpdateData.bio = data.bio || null;
    }
    if (data.education !== undefined) {
      teacherUpdateData.education = data.education || null;
    }
    if (data.experience !== undefined) {
      teacherUpdateData.experience = data.experience !== null ? parseInt(data.experience) : null;
    }
    if (data.salaryFormat !== undefined) {
      teacherUpdateData.salaryFormat = data.salaryFormat ? (data.salaryFormat as SalaryFormat) : null;
    }
    if (data.salaryAmount !== undefined) {
      teacherUpdateData.salaryAmount = data.salaryAmount !== null ? parseFloat(data.salaryAmount) : null;
    }

    // Update teacher
    const teacher = await prisma.teacher.update({
      where: { id },
      data: teacherUpdateData,
    });

    // Update subjects if provided
    if (data.subjectIds !== undefined) {
      // Delete existing subjects
      await prisma.teacherSubject.deleteMany({
        where: { teacherId: id },
      });

      // Create new subjects
      if (data.subjectIds && data.subjectIds.length > 0) {
        await prisma.teacherSubject.createMany({
          data: data.subjectIds.map((subjectId: string) => ({
            teacherId: id,
            subjectId,
          })),
        });
      }
    }

    // Update branches if provided
    if (data.branchIds !== undefined) {
      // Delete existing branches
      await prisma.teacherBranch.deleteMany({
        where: { teacherId: id },
      });

      // Create new branches
      if (data.branchIds && data.branchIds.length > 0) {
        await prisma.teacherBranch.createMany({
          data: data.branchIds.map((branchId: string) => ({
            teacherId: id,
            branchId,
          })),
        });
      }
    }

    // Fetch updated teacher with relations
    const updatedTeacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            email: true,
            phone: true,
          },
        },
        category: { select: { id: true, name: true } },
        subjects: {
          include: {
            subject: { select: { id: true, nameRu: true, nameKz: true } },
          },
        },
        branches: {
          include: {
            branch: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json(updatedTeacher);
  } catch (error) {
    console.error('Update teacher error:', error);
    return NextResponse.json(
      { error: 'Failed to update teacher' },
      { status: 500 }
    );
  }
}

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

    const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.SUPERADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete - set isActive to false
    await prisma.teacher.update({
      where: { id },
      data: { isActive: false, status: TeacherStatus.SUSPENDED },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return NextResponse.json(
      { error: 'Failed to delete teacher' },
      { status: 500 }
    );
  }
}
