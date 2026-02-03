import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { writeFile, mkdir, unlink, readFile } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

const execFileAsync = promisify(execFile);

const MAX_DURATION_SEC = 60;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('audio') as File | null;
    const duration = parseFloat(formData.get('duration') as string) || 0;

    if (!file) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    if (duration > MAX_DURATION_SEC + 1) {
      return NextResponse.json({ error: 'Audio too long' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const id = crypto.randomUUID();
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'audio');
    await mkdir(uploadDir, { recursive: true });

    const isWebm = file.type.includes('webm');

    let finalFilename: string;

    if (isWebm) {
      // Convert WebM to OGG Opus via ffmpeg for better compatibility
      const tmpDir = os.tmpdir();
      const inputPath = path.join(tmpDir, `${id}.webm`);
      const outputPath = path.join(tmpDir, `${id}.ogg`);

      try {
        await writeFile(inputPath, buffer);
        await execFileAsync('ffmpeg', [
          '-i', inputPath,
          '-c:a', 'libopus',
          '-b:a', '64k',
          '-y',
          outputPath,
        ]);
        const oggBuffer = await readFile(outputPath);
        finalFilename = `${id}.ogg`;
        await writeFile(path.join(uploadDir, finalFilename), oggBuffer);
      } finally {
        unlink(inputPath).catch(() => {});
        unlink(outputPath).catch(() => {});
      }
    } else {
      // OGG or MP4 — save as-is
      const ext = file.type.includes('mp4') ? 'm4a' : 'ogg';
      finalFilename = `${id}.${ext}`;
      await writeFile(path.join(uploadDir, finalFilename), buffer);
    }

    const url = `/uploads/audio/${finalFilename}`;

    return NextResponse.json({
      url,
      duration: Math.round(duration),
      size: file.size,
    });
  } catch (error) {
    console.error('Audio upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
