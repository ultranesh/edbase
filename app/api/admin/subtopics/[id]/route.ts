import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// PATCH - Update subtopic
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

    const subtopic = await prisma.taskSubtopic.update({
      where: { id },
      data: {
        name: data.name,
        nameRu: data.nameRu,
        nameKz: data.nameKz,
        nameEn: data.nameEn,
        orderIndex: data.orderIndex,
        isActive: data.isActive,
      },
    });

    return NextResponse.json(subtopic);
  } catch (error) {
    console.error('Update subtopic error:', error);
    return NextResponse.json(
      { error: 'Failed to update subtopic' },
      { status: 500 }
    );
  }
}

// DELETE - Delete subtopic
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
      return NextResponse.json({ error: 'Forbidden. Only SUPERADMIN can delete subtopics' }, { status: 403 });
    }

    await prisma.taskSubtopic.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete subtopic error:', error);
    return NextResponse.json(
      { error: 'Failed to delete subtopic' },
      { status: 500 }
    );
  }
}
