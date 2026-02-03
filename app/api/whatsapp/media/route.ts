import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;

// GET /api/whatsapp/media?url=<media_id_or_url>
// Proxies WhatsApp media through the server (browser can't access directly)
// Accepts either a media ID (e.g. "1234567890") or a legacy fbcdn URL
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const input = searchParams.get('url');

    if (!input) {
      return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
    }

    let mediaUrl: string;

    if (input.startsWith('http')) {
      // Legacy: direct URL (may be expired)
      const url = new URL(input);
      if (!url.hostname.includes('fbcdn') && !url.hostname.includes('facebook') && !url.hostname.includes('whatsapp')) {
        return NextResponse.json({ error: 'Invalid media URL' }, { status: 400 });
      }
      mediaUrl = input;
    } else {
      // New: media ID — resolve to fresh URL via Graph API
      const metaRes = await fetch(`https://graph.facebook.com/v22.0/${input}`, {
        headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
      });
      const metaData = await metaRes.json();

      if (!metaRes.ok || !metaData.url) {
        console.error('[WhatsApp Media] Failed to resolve media ID:', input, metaData);
        return NextResponse.json({ error: 'Failed to resolve media' }, { status: 400 });
      }
      mediaUrl = metaData.url;
    }

    const res = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
    });

    if (!res.ok) {
      // If legacy URL expired, return error
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const buffer = await res.arrayBuffer();
    const totalSize = buffer.byteLength;

    // Handle Range requests (required for video playback)
    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;
        const chunkSize = end - start + 1;

        return new Response(buffer.slice(start, end + 1), {
          status: 206,
          headers: {
            'Content-Type': contentType,
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Content-Length': String(chunkSize),
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'private, max-age=300',
          },
        });
      }
    }

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(totalSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    console.error('[WhatsApp Media Proxy] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
