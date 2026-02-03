import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export const revalidate = 3600;

// Default role definitions matching the UserRole enum
const DEFAULT_ROLES: Record<string, { name: string; nameKz: string; nameRu: string; nameEn: string; orderIndex: number }> = {
  [UserRole.SUPERADMIN]:          { name: 'Суперадминистратор',      nameKz: 'Суперәкімші',               nameRu: 'Суперадминистратор',      nameEn: 'Super Admin',          orderIndex: 0 },
  [UserRole.ADMIN]:               { name: 'Администратор',           nameKz: 'Әкімші',                   nameRu: 'Администратор',           nameEn: 'Admin',                orderIndex: 1 },
  [UserRole.DEPARTMENT_HEAD]:     { name: 'Заведующий отделением',   nameKz: 'Бөлім меңгерушісі',        nameRu: 'Заведующий отделением',   nameEn: 'Department Head',      orderIndex: 2 },
  [UserRole.CURATOR]:             { name: 'Куратор',                 nameKz: 'Куратор',                  nameRu: 'Куратор',                 nameEn: 'Curator',              orderIndex: 3 },
  [UserRole.COORDINATOR]:         { name: 'Координатор',             nameKz: 'Үйлестіруші',              nameRu: 'Координатор',             nameEn: 'Coordinator',          orderIndex: 4 },
  [UserRole.COORDINATOR_MANAGER]: { name: 'Координатор-менеджер',    nameKz: 'Үйлестіруші-менеджер',     nameRu: 'Координатор-менеджер',    nameEn: 'Coordinator Manager',  orderIndex: 5 },
  [UserRole.TEACHER]:             { name: 'Преподаватель',           nameKz: 'Оқытушы',                  nameRu: 'Преподаватель',           nameEn: 'Teacher',              orderIndex: 6 },
  [UserRole.PARENT]:              { name: 'Родитель',                nameKz: 'Ата-ана',                  nameRu: 'Родитель',                nameEn: 'Parent',               orderIndex: 7 },
  [UserRole.ONLINE_MENTOR]:       { name: 'Онлайн-ментор',          nameKz: 'Онлайн-тәлімгер',          nameRu: 'Онлайн-ментор',           nameEn: 'Online Mentor',        orderIndex: 8 },
  [UserRole.STUDENT]:             { name: 'Ученик',                 nameKz: 'Оқушы',                   nameRu: 'Ученик',                  nameEn: 'Student',              orderIndex: 9 },
};

export async function GET() {
  try {
    // Auto-seed: ensure all enum values exist in the reference table
    const existing = await prisma.refUserRole.findMany();
    const existingCodes = new Set(existing.map((r) => r.code));

    const missingRoles = Object.entries(DEFAULT_ROLES).filter(
      ([code]) => !existingCodes.has(code)
    );

    if (missingRoles.length > 0) {
      await prisma.refUserRole.createMany({
        data: missingRoles.map(([code, defaults]) => ({
          code,
          ...defaults,
        })),
      });
    }

    const items = await prisma.refUserRole.findMany({
      orderBy: { orderIndex: 'asc' },
    });
    return NextResponse.json(items, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return NextResponse.json({ error: 'Failed to fetch user roles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const item = await prisma.refUserRole.create({
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
    console.error('Error creating user role:', error);
    return NextResponse.json({ error: 'Failed to create user role' }, { status: 500 });
  }
}
