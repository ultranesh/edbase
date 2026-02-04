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

    // Only coordinators and above can send template messages
    const allowedRoles = ['COORDINATOR', 'CHIEF_COORDINATOR', 'ADMIN', 'SUPERADMIN'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { phone, templateName, languageCode, leadId, contactName, components } = body;

    if (!phone || !templateName || !languageCode) {
      return NextResponse.json(
        { error: 'phone, templateName, and languageCode are required' },
        { status: 400 }
      );
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

    // Build template payload
    const templatePayload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      to: waId,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    };

    // Add components (header, body, buttons) if provided
    if (components && Array.isArray(components) && components.length > 0) {
      (templatePayload.template as Record<string, unknown>).components = components;
    }

    // Send template message via WhatsApp Cloud API
    const res = await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(templatePayload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[WhatsApp Template Send] Error:', data);
      return NextResponse.json(
        { error: data.error?.message || 'Failed to send template message' },
        { status: 400 }
      );
    }

    const waMessageId = data.messages?.[0]?.id || null;

    // Generate a preview text for the template message
    const templatePreview = `[Шаблон: ${templateName}]`;

    // Save outgoing message
    const message = await prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        waMessageId,
        direction: 'OUTGOING',
        type: 'TEMPLATE',
        body: templatePreview,
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
    console.error('[WhatsApp Template Send] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
