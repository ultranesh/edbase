import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, unlink } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

const execFileAsync = promisify(execFile);

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

// Convert any audio to OGG Opus via ffmpeg (WhatsApp requires OGG Opus for voice messages)
async function convertAudioToOggOpus(fileBuffer: Buffer): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const id = crypto.randomUUID();
  const inputPath = path.join(tmpDir, `${id}.input`);
  const outputPath = path.join(tmpDir, `${id}.ogg`);

  const wavPath = path.join(tmpDir, `${id}.wav`);

  try {
    await writeFile(inputPath, fileBuffer);
    // Pass 1: Decode to raw WAV (strips all container metadata from WebM)
    await execFileAsync('ffmpeg', [
      '-i', inputPath,
      '-vn',
      '-ac', '1',
      '-ar', '48000',
      '-c:a', 'pcm_s16le',
      '-y',
      wavPath,
    ]);
    // Pass 2: Encode clean WAV to OGG Opus with VoIP settings
    await execFileAsync('ffmpeg', [
      '-i', wavPath,
      '-c:a', 'libopus',
      '-b:a', '64k',
      '-application', 'voip',
      '-frame_duration', '20',
      '-y',
      outputPath,
    ]);
    const { readFile } = await import('fs/promises');
    const result = await readFile(outputPath);
    return result;
  } finally {
    unlink(inputPath).catch(() => {});
    unlink(wavPath).catch(() => {});
    unlink(outputPath).catch(() => {});
  }
}

// POST — Upload media to WhatsApp and send it
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const conversationId = formData.get('conversationId') as string;
    const caption = formData.get('caption') as string | null;

    if (!file || !conversationId) {
      return NextResponse.json({ error: 'file and conversationId are required' }, { status: 400 });
    }

    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Step 1: Prepare file for WhatsApp upload
    let uploadMimeType = file.type.split(';')[0].trim();
    let uploadBuffer: Buffer;

    // Convert ALL audio to OGG Opus via ffmpeg (WhatsApp requires proper OGG Opus for voice messages)
    if (uploadMimeType.startsWith('audio/')) {
      try {
        const audioBuffer = Buffer.from(await file.arrayBuffer());
        uploadBuffer = await convertAudioToOggOpus(audioBuffer);
        console.log('[WhatsApp Upload] Audio converted:', audioBuffer.length, '->', uploadBuffer.length, 'bytes');
        uploadMimeType = 'audio/ogg';
      } catch (convErr) {
        console.error('[WhatsApp Upload] ffmpeg conversion failed:', convErr);
        return NextResponse.json({ error: 'Audio conversion failed' }, { status: 500 });
      }
    } else {
      uploadBuffer = Buffer.from(await file.arrayBuffer());
    }

    // Step 2: Upload to WhatsApp via curl (Node.js FormData+Blob corrupts binary data)
    const uploadFileName = uploadMimeType === 'audio/ogg' ? 'voice.ogg' : file.name;
    const tmpUploadPath = path.join(os.tmpdir(), `wa_upload_${crypto.randomUUID()}${path.extname(uploadFileName)}`);
    await writeFile(tmpUploadPath, uploadBuffer);

    let mediaId: string;
    try {
      const { stdout: curlOut } = await execFileAsync('curl', [
        '-s', '-X', 'POST',
        `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/media`,
        '-H', `Authorization: Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        '-F', `file=@${tmpUploadPath};type=${uploadMimeType};filename=${uploadFileName}`,
        '-F', 'messaging_product=whatsapp',
        '-F', `type=${uploadMimeType}`,
      ]);

      let uploadData: { id?: string; error?: { message?: string } };
      try {
        uploadData = JSON.parse(curlOut);
      } catch {
        console.error('[WhatsApp Upload] curl returned non-JSON:', curlOut);
        return NextResponse.json({ error: 'Upload failed: invalid response' }, { status: 500 });
      }

      if (!uploadData.id) {
        console.error('[WhatsApp Upload] Error:', uploadData);
        return NextResponse.json({ error: uploadData.error?.message || 'Upload failed' }, { status: 400 });
      }

      mediaId = uploadData.id;
      console.log('[WhatsApp Upload] Media uploaded via curl, id:', mediaId, 'mime:', uploadMimeType, 'filename:', uploadFileName);
    } finally {
      unlink(tmpUploadPath).catch(() => {});
    }

    // Step 3: Determine message type from MIME
    let msgType: 'image' | 'video' | 'audio' | 'document' | 'sticker' = 'document';
    let dbType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER' = 'DOCUMENT';

    if (file.type.startsWith('image/')) {
      if (file.type === 'image/webp') {
        msgType = 'sticker';
        dbType = 'STICKER';
      } else {
        msgType = 'image';
        dbType = 'IMAGE';
      }
    } else if (file.type.startsWith('video/')) {
      msgType = 'video';
      dbType = 'VIDEO';
    } else if (file.type.startsWith('audio/')) {
      msgType = 'audio';
      dbType = 'AUDIO';
    }

    // Step 4: Send media message
    const messageBody: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      to: conversation.waId,
      type: msgType,
    };

    if (msgType === 'image') {
      messageBody.image = { id: mediaId, ...(caption ? { caption } : {}) };
    } else if (msgType === 'video') {
      messageBody.video = { id: mediaId, ...(caption ? { caption } : {}) };
    } else if (msgType === 'audio') {
      messageBody.audio = { id: mediaId, voice: true };
    } else if (msgType === 'sticker') {
      messageBody.sticker = { id: mediaId };
    } else {
      messageBody.document = { id: mediaId, filename: file.name, ...(caption ? { caption } : {}) };
    }

    const sendRes = await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(messageBody),
    });

    const sendData = await sendRes.json();
    console.log('[WhatsApp Send Media] Response:', JSON.stringify(sendData).slice(0, 500));

    if (!sendRes.ok) {
      console.error('[WhatsApp Send Media] Error:', sendData);
      return NextResponse.json({ error: sendData.error?.message || 'Send failed' }, { status: 400 });
    }

    const waMessageId = sendData.messages?.[0]?.id || null;

    // Step 5: Save to DB (save mediaId so proxy can resolve it for display)
    const message = await prisma.whatsAppMessage.create({
      data: {
        conversationId,
        waMessageId,
        direction: 'OUTGOING',
        type: dbType,
        body: caption || null,
        mediaUrl: mediaId,
        mediaCaption: caption || null,
        mediaMimeType: uploadMimeType,
        mediaFileName: file.name,
        status: 'SENT',
        sentById: session.user.id,
      },
      include: {
        sentBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    await prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date(), unreadCount: 0 },
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error('[WhatsApp Upload] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
