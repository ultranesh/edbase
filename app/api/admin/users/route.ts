import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

// GET - Fetch all users
export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        iin: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        isActive: true,
        lastLogin: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, firstName, lastName, role, iin } = body;

    // Validate required fields
    if (!password || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Все обязательные поля должны быть заполнены' },
        { status: 400 }
      );
    }

    if (!iin && !email) {
      return NextResponse.json(
        { error: 'Необходимо указать ИИН или email' },
        { status: 400 }
      );
    }

    // Check if IIN is already taken
    if (iin) {
      const existingIin = await prisma.user.findUnique({
        where: { iin },
      });
      if (existingIin) {
        return NextResponse.json(
          { error: 'Пользователь с таким ИИН уже существует' },
          { status: 400 }
        );
      }
    }

    // Use provided email or generate from IIN
    const userEmail = email || `${iin}@ertis.local`;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        iin: iin || null,
        password: hashedPassword,
        plainPassword: password,
        firstName,
        lastName,
        role,
      },
      select: {
        id: true,
        email: true,
        iin: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
