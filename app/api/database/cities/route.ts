import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// No cache for admin database pages
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await prisma.refCity.findMany({
      include: { region: true },
      orderBy: { orderIndex: 'asc' },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json({
      error: 'Failed to fetch',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const item = await prisma.refCity.create({ data });
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
