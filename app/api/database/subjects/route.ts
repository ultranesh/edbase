import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Cache for 1 hour, revalidate in background
export const revalidate = 3600;

export async function GET() {
  try {
    const items = await prisma.refSubject.findMany({ orderBy: { orderIndex: 'asc' } });
    return NextResponse.json(items, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const item = await prisma.refSubject.create({ data });
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
