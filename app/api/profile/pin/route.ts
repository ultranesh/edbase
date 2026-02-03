import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pin } = await request.json();

    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { pin: hashedPin },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PIN change error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pin } = await request.json();

    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { pin: true },
    });

    if (!user?.pin) {
      return NextResponse.json({ error: 'No PIN set' }, { status: 400 });
    }

    const valid = await bcrypt.compare(pin, user.pin);
    if (!valid) {
      return NextResponse.json({ error: 'Wrong PIN' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { pin: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PIN delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
