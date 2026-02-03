import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 3600;

export async function GET() {
  try {
    const items = await prisma.refStudySchedule.findMany({
      orderBy: { orderIndex: 'asc' },
    });
    return NextResponse.json(items, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error fetching study schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch study schedules' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const item = await prisma.refStudySchedule.create({
      data: {
        code: data.code,
        name: data.name,
        nameKz: data.nameKz,
        nameRu: data.nameRu,
        nameEn: data.nameEn,
        orderIndex: data.orderIndex || 0,
        isActive: data.isActive ?? true,
      },
    });
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error creating study schedule:', error);
    return NextResponse.json({ error: 'Failed to create study schedule' }, { status: 500 });
  }
}
