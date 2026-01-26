import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Cache for 1 hour, revalidate in background
export const revalidate = 3600;

export async function GET() {
  try {
    const languages = await prisma.refLanguage.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(languages, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error fetching languages:', error);
    return NextResponse.json({ error: 'Failed to fetch languages' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const language = await prisma.refLanguage.create({
      data: {
        name: data.name,
        code: data.code,
      },
    });
    return NextResponse.json(language);
  } catch (error) {
    console.error('Error creating language:', error);
    return NextResponse.json({ error: 'Failed to create language' }, { status: 500 });
  }
}
