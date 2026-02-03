import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();

    console.log('=== PATCH subjects ===');
    console.log('ID:', id);
    console.log('Data:', JSON.stringify(data, null, 2));

    const item = await prisma.refSubject.update({
      where: { id },
      data: {
        code: data.code,
        nameKz: data.nameKz,
        nameRu: data.nameRu,
        nameEn: data.nameEn,
        orderIndex: data.orderIndex,
        isActive: data.isActive,
      }
    });

    console.log('Updated:', JSON.stringify(item, null, 2));
    return NextResponse.json(item);
  } catch (error) {
    console.error('PATCH Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.refSubject.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
