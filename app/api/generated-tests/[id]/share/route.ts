import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - поделиться тестом с пользователем
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { phone, canEdit } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Проверяем, что тест существует и пользователь - его создатель
    const generatedTest = await prisma.generatedTest.findUnique({
      where: { id },
    });

    if (!generatedTest) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    if (generatedTest.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Находим пользователя по номеру телефона
    const userToShare = await prisma.user.findFirst({
      where: { phone },
    });

    if (!userToShare) {
      return NextResponse.json(
        { error: 'User with this phone number not found' },
        { status: 404 }
      );
    }

    // Нельзя поделиться с самим собой
    if (userToShare.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot share with yourself' },
        { status: 400 }
      );
    }

    // Создаем запись о sharing (или обновляем, если уже есть)
    const share = await prisma.generatedTestShare.upsert({
      where: {
        generatedTestId_sharedWithId: {
          generatedTestId: id,
          sharedWithId: userToShare.id,
        },
      },
      update: {
        canEdit: canEdit ?? false,
      },
      create: {
        generatedTestId: id,
        sharedWithId: userToShare.id,
        canEdit: canEdit ?? false,
      },
      include: {
        sharedWith: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    // Обновляем флаг isShared у теста
    await prisma.generatedTest.update({
      where: { id },
      data: { isShared: true },
    });

    return NextResponse.json({
      success: true,
      share,
    });
  } catch (error) {
    console.error('Error sharing test:', error);
    return NextResponse.json(
      { error: 'Failed to share test' },
      { status: 500 }
    );
  }
}

// GET - получить список пользователей, с которыми поделились
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Проверяем, что тест существует и пользователь - его создатель
    const generatedTest = await prisma.generatedTest.findUnique({
      where: { id },
    });

    if (!generatedTest) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    if (generatedTest.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const shares = await prisma.generatedTestShare.findMany({
      where: { generatedTestId: id },
      include: {
        sharedWith: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json(shares);
  } catch (error) {
    console.error('Error fetching shares:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shares' },
      { status: 500 }
    );
  }
}

// DELETE - отменить sharing
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { shareId } = await request.json();

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      );
    }

    // Проверяем, что тест существует и пользователь - его создатель
    const generatedTest = await prisma.generatedTest.findUnique({
      where: { id },
    });

    if (!generatedTest) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    if (generatedTest.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await prisma.generatedTestShare.delete({
      where: { id: shareId },
    });

    // Проверяем, остались ли еще shares
    const remainingShares = await prisma.generatedTestShare.count({
      where: { generatedTestId: id },
    });

    if (remainingShares === 0) {
      await prisma.generatedTest.update({
        where: { id },
        data: { isShared: false },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing share:', error);
    return NextResponse.json(
      { error: 'Failed to remove share' },
      { status: 500 }
    );
  }
}
