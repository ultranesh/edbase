import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// PATCH - Update classroom
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

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();

    const classroom = await prisma.classroom.update({
      where: { id },
      data: {
        name: data.name,
        capacity: data.capacity,
        equipment: data.equipment,
        isActive: data.isActive,
      },
      include: {
        branch: true,
      },
    });

    return NextResponse.json(classroom);
  } catch (error) {
    console.error('Update classroom error:', error);
    return NextResponse.json(
      { error: 'Failed to update classroom' },
      { status: 500 }
    );
  }
}

// DELETE - Delete classroom
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

    if (session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: 'Forbidden. Only SUPERADMIN can delete classrooms' }, { status: 403 });
    }

    await prisma.classroom.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete classroom error:', error);
    return NextResponse.json(
      { error: 'Failed to delete classroom' },
      { status: 500 }
    );
  }
}
