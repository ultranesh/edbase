import { NextRequest, NextResponse } from 'next/server';
import {
  getVerifyToken,
  validateWebhookSignature,
  parseWebhookEntries,
} from '@/lib/social/meta-send';
import {
  processIncomingMessage,
  processDelivery,
  processRead,
} from '@/lib/social/webhook-processor';

const PLATFORM = 'INSTAGRAM' as const;

// Webhook verification (Meta sends GET to verify)
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  if (mode === 'subscribe' && token === getVerifyToken(PLATFORM)) {
    console.log('[Instagram Webhook] Verified');
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// Receive webhook events from Meta
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Validate signature
    const signature = request.headers.get('x-hub-signature-256');
    if (process.env.META_APP_SECRET && !validateWebhookSignature(rawBody, signature)) {
      console.error('[Instagram Webhook] Invalid signature');
      return NextResponse.json({ status: 'ok' });
    }

    const body = JSON.parse(rawBody);

    // Instagram webhooks use 'instagram' as object type
    if (body.object !== 'instagram') {
      return NextResponse.json({ status: 'ok' });
    }

    const events = parseWebhookEntries(body);

    for (const event of events) {
      try {
        if (event.message) {
          await processIncomingMessage(PLATFORM, event);
        } else if (event.delivery) {
          await processDelivery(PLATFORM, event);
        } else if (event.read) {
          await processRead(PLATFORM, event);
        }
      } catch (err) {
        console.error('[Instagram Webhook] Error processing event:', err);
      }
    }
  } catch (error) {
    console.error('[Instagram Webhook] Error:', error);
  }

  // Always return 200 to prevent Meta retries
  return NextResponse.json({ status: 'ok' });
}
