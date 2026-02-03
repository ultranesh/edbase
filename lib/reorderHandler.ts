import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type PrismaModel = {
  update: (args: { where: { id: string }; data: { orderIndex: number } }) => Promise<unknown>;
};

export async function handleReorder(
  request: Request,
  model: PrismaModel
) {
  try {
    const { items } = await request.json();

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Update all items in a transaction
    await prisma.$transaction(
      items.map((item: { id: string; orderIndex: number }) =>
        model.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering:', error);
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
  }
}
