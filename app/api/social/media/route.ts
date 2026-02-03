import { NextRequest, NextResponse } from 'next/server';

// GET /api/social/media — proxy media from Meta CDN
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
  }

  // Validate URL is from Meta CDN
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const allowed = ['fbcdn.net', 'facebook.com', 'fb.com', 'cdninstagram.com', 'instagram.com'];
    if (!allowed.some(d => host.includes(d))) {
      return NextResponse.json({ error: 'Invalid media URL' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const rangeHeader = request.headers.get('range');
    const headers: Record<string, string> = {};
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const res = await fetch(url, { headers });

    if (!res.ok && res.status !== 206) {
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: 502 });
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const contentLength = res.headers.get('content-length');
    const contentRange = res.headers.get('content-range');

    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=300',
      'Accept-Ranges': 'bytes',
    };

    if (contentLength) responseHeaders['Content-Length'] = contentLength;
    if (contentRange) responseHeaders['Content-Range'] = contentRange;

    const body = res.body;

    return new NextResponse(body, {
      status: res.status === 206 ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[Social Media Proxy] Error:', error);
    return NextResponse.json({ error: 'Failed to proxy media' }, { status: 500 });
  }
}
