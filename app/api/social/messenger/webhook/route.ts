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

const PLATFORM = 'MESSENGER' as const;

// Webhook verification (Meta sends GET to verify)
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  if (mode === 'subscribe' && token === getVerifyToken(PLATFORM)) {
    console.log('[Messenger Webhook] Verified');
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// Receive webhook events from Meta
export async function POST(request: NextRequest) {
  console.log('[Messenger Webhook] POST received');
  try {
    const rawBody = await request.text();
    console.log('[Messenger Webhook] Body:', rawBody.substring(0, 500));

    // Validate signature
    const signature = request.headers.get('x-hub-signature-256');
    if (process.env.META_APP_SECRET && !validateWebhookSignature(rawBody, signature)) {
      console.error('[Messenger Webhook] Invalid signature');
      return NextResponse.json({ status: 'ok' });
    }

    const body = JSON.parse(rawBody);
    console.log('[Messenger Webhook] Object type:', body.object);

    // Only process page events
    if (body.object !== 'page') {
      console.log('[Messenger Webhook] Skipping non-page object');
      return NextResponse.json({ status: 'ok' });
    }

    const events = parseWebhookEntries(body);
    console.log('[Messenger Webhook] Parsed events:', events.length);

    for (const event of events) {
      console.log('[Messenger Webhook] Processing event from:', event.sender?.id);
      try {
        if (event.message) {
          console.log('[Messenger Webhook] Message event:', event.message.text || event.message.attachments?.length + ' attachments');
          await processIncomingMessage(PLATFORM, event);
          console.log('[Messenger Webhook] Message processed successfully');
        } else if (event.delivery) {
          await processDelivery(PLATFORM, event);
        } else if (event.read) {
          await processRead(PLATFORM, event);
        }
      } catch (err) {
        console.error('[Messenger Webhook] Error processing event:', err);
      }
    }
  } catch (error) {
    console.error('[Messenger Webhook] Error:', error);
  }

  // Always return 200 to prevent Meta retries
  return NextResponse.json({ status: 'ok' });
}
