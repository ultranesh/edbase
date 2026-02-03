import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

// POST — Create a new conversation and send the first message
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phone, leadId, contactName, text } = body;

    if (!phone || !text?.trim()) {
      return NextResponse.json({ error: 'phone and text are required' }, { status: 400 });
    }

    const waId = phone.replace(/\D/g, '');

    // Check if conversation already exists
    let conversation = await prisma.whatsAppConversation.findUnique({
      where: { waId },
    });

    if (!conversation) {
      conversation = await prisma.whatsAppConversation.create({
        data: {
          waId,
          contactPhone: phone,
          contactName: contactName || null,
          leadId: leadId || null,
        },
      });
    }

    // Send text message via WhatsApp Cloud API
    const res = await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: waId,
        type: 'text',
        text: { body: text.trim() },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[WhatsApp Init Send] Error:', data);
      return NextResponse.json(
        { error: data.error?.message || 'Failed to send message' },
        { status: 400 }
      );
    }

    const waMessageId = data.messages?.[0]?.id || null;

    // Save outgoing message
    const message = await prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        waMessageId,
        direction: 'OUTGOING',
        type: 'TEXT',
        body: text.trim(),
        status: 'SENT',
        sentById: session.user.id,
      },
      include: {
        sentBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Update conversation lastMessageAt
    await prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), unreadCount: 0 },
    });

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        waId: conversation.waId,
        contactName: conversation.contactName,
        contactPhone: conversation.contactPhone,
        unreadCount: 0,
        lastMessageAt: new Date().toISOString(),
        lastMessage: null,
        lead: null,
      },
      message,
    });
  } catch (error) {
    console.error('[WhatsApp Init Conversation] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET — List all WhatsApp conversations (for CRM sidebar)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await prisma.whatsAppConversation.findMany({
      orderBy: { lastMessageAt: 'desc' },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            stage: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            body: true,
            type: true,
            direction: true,
            createdAt: true,
          },
        },
      },
    });

    const result = conversations.map(c => ({
      id: c.id,
      waId: c.waId,
      contactName: c.contactName,
      contactPhone: c.contactPhone,
      lead: c.lead,
      unreadCount: c.unreadCount,
      isBlocked: c.isBlocked,
      lastMessageAt: c.lastMessageAt,
      lastMessage: c.messages[0] || null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[WhatsApp Conversations] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
