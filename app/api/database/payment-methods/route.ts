import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 3600;

export async function GET() {
  try {
    const items = await prisma.refPaymentMethod.findMany({ orderBy: { orderIndex: 'asc' } });
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const item = await prisma.refPaymentMethod.create({
      data: { code: data.code, name: data.name, nameKz: data.nameKz, nameRu: data.nameRu, nameEn: data.nameEn, commission: data.commission ?? 0, orderIndex: data.orderIndex || 0, isActive: data.isActive ?? true },
    });
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
