import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true, avatarLocked: true },
    });

    if (currentUser?.avatarLocked) {
      return NextResponse.json({ error: 'Avatar is locked by administrator' }, { status: 403 });
    }

    if (currentUser?.avatar) {
      try {
        const oldPath = path.join(process.cwd(), 'public', currentUser.avatar);
        await unlink(oldPath);
      } catch {
        // Old file may not exist
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
    const filename = `${crypto.randomUUID()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    const url = `/uploads/avatars/${filename}`;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatar: url },
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true, avatarLocked: true },
    });

    if (currentUser?.avatarLocked) {
      return NextResponse.json({ error: 'Avatar is locked by administrator' }, { status: 403 });
    }

    if (currentUser?.avatar) {
      try {
        const oldPath = path.join(process.cwd(), 'public', currentUser.avatar);
        await unlink(oldPath);
      } catch {
        // File may not exist
      }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatar: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Avatar delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
