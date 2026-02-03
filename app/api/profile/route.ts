import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        iin: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
        role: true,
        avatar: true,
        pin: true,
        avatarLocked: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
        student: {
          select: {
            id: true,
            balance: true,
            totalEarned: true,
            status: true,
            dateOfBirth: true,
            gradeLevel: { select: { name: true } },
            language: { select: { name: true } },
            studyDirection: { select: { name: true } },
            school: { select: { name: true } },
            city: { select: { name: true } },
            branch: { select: { name: true } },
          },
        },
        teacher: {
          select: {
            id: true,
            status: true,
            experience: true,
            bio: true,
            dateOfBirth: true,
            category: { select: { name: true } },
            subjects: { select: { subject: { select: { nameRu: true, nameKz: true } } } },
          },
        },
        parent: { select: { id: true, occupation: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...user,
      hasPin: !!user.pin,
      pin: undefined,
    });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, middleName, phone } = body;

    const updateData: Record<string, string | null> = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (middleName !== undefined) updateData.middleName = middleName || null;
    if (phone !== undefined) updateData.phone = phone || null;

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: { id: true, firstName: true, lastName: true, middleName: true, phone: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Profile PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
