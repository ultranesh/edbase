import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const item = await prisma.refGender.update({
      where: { id },
      data,
    });
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error updating gender:', error);
    return NextResponse.json({ error: 'Failed to update gender' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.refGender.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting gender:', error);
    return NextResponse.json({ error: 'Failed to delete gender' }, { status: 500 });
  }
}
