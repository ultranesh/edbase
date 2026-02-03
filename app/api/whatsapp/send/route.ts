import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, text, location } = body;

    if (!conversationId || (!text && !location)) {
      return NextResponse.json({ error: 'conversationId and (text or location) are required' }, { status: 400 });
    }

    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Build message payload based on type
    let waPayload: Record<string, unknown>;
    let msgType: string;
    let msgBody: string;

    if (location) {
      // Location message
      waPayload = {
        messaging_product: 'whatsapp',
        to: conversation.waId,
        type: 'location',
        location: {
          latitude: String(location.latitude),
          longitude: String(location.longitude),
          name: location.name || undefined,
          address: location.address || undefined,
        },
      };
      msgType = 'LOCATION';
      msgBody = `${location.latitude},${location.longitude}${location.name ? ' — ' + location.name : ''}`;
    } else {
      // Text message
      waPayload = {
        messaging_product: 'whatsapp',
        to: conversation.waId,
        type: 'text',
        text: { body: text },
      };
      msgType = 'TEXT';
      msgBody = text;
    }

    // Send via Meta Cloud API
    const res = await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(waPayload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[WhatsApp Send] Error:', data);
      return NextResponse.json(
        { error: data.error?.message || 'Failed to send message' },
        { status: 400 }
      );
    }

    const waMessageId = data.messages?.[0]?.id || null;

    // Save outgoing message
    const message = await prisma.whatsAppMessage.create({
      data: {
        conversationId,
        waMessageId,
        direction: 'OUTGOING',
        type: msgType as 'TEXT' | 'LOCATION',
        body: msgBody,
        status: 'SENT',
        sentById: session.user.id,
      },
      include: {
        sentBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Update conversation: set lastMessageAt and reset unread count
    await prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date(), unreadCount: 0 },
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error('[WhatsApp Send] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
