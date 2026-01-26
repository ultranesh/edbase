import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// GET - Fetch all classrooms
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    const where = branchId ? { branchId } : {};

    const classrooms = await prisma.classroom.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        branch: true,
      },
    });

    return NextResponse.json(classrooms);
  } catch (error) {
    console.error('Get classrooms error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classrooms' },
      { status: 500 }
    );
  }
}

// POST - Create new classroom
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

    const classroom = await prisma.classroom.create({
      data: {
        branchId: data.branchId,
        name: data.name,
        capacity: data.capacity || 15,
        equipment: data.equipment || [],
        isActive: true,
      },
      include: {
        branch: true,
      },
    });

    return NextResponse.json(classroom);
  } catch (error) {
    console.error('Create classroom error:', error);
    return NextResponse.json(
      { error: 'Failed to create classroom' },
      { status: 500 }
    );
  }
}
