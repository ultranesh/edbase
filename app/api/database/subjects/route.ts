import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Disable caching for this route
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await prisma.refSubject.findMany({ orderBy: { orderIndex: 'asc' } });
    return NextResponse.json(items);
  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('=== POST subjects ===');
    console.log('Data:', JSON.stringify(data, null, 2));

    const item = await prisma.refSubject.create({
      data: {
        code: data.code,
        nameKz: data.nameKz,
        nameRu: data.nameRu,
        nameEn: data.nameEn,
        orderIndex: data.orderIndex ?? 0,
        isActive: data.isActive ?? true,
      }
    });
    console.log('Created:', JSON.stringify(item, null, 2));
    return NextResponse.json(item);
  } catch (error) {
    console.error('POST Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
