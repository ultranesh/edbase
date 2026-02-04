import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const WHATSAPP_WABA_ID = process.env.WHATSAPP_WABA_ID!;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only coordinators and above can access templates
    const allowedRoles = ['COORDINATOR', 'CHIEF_COORDINATOR', 'ADMIN', 'SUPERADMIN'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!WHATSAPP_WABA_ID) {
      return NextResponse.json({ error: 'WHATSAPP_WABA_ID not configured' }, { status: 500 });
    }

    // Fetch templates from Meta Graph API
    const res = await fetch(
      `https://graph.facebook.com/v22.0/${WHATSAPP_WABA_ID}/message_templates?status=APPROVED&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error('[WhatsApp Templates] Error:', data);
      return NextResponse.json(
        { error: data.error?.message || 'Failed to fetch templates' },
        { status: 400 }
      );
    }

    // Filter and format templates for use
    const templates = (data.data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      language: t.language,
      category: t.category,
      status: t.status,
      components: t.components,
    }));

    return NextResponse.json(templates);
  } catch (error) {
    console.error('[WhatsApp Templates] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
