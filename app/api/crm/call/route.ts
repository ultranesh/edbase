import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const SIPUNI_USER = '012238';
const SIPUNI_SECRET = '0.hq1u388wcgj';

function sipuniHash(params: Record<string, string>): string {
  const keys = Object.keys(params).sort();
  const values = keys.map(k => params[k]);
  values.push(SIPUNI_SECRET);
  return crypto.createHash('md5').update(values.join('+')).digest('hex');
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Get current user's sipNumber
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { sipNumber: true },
    });

    if (!user?.sipNumber) {
      return NextResponse.json(
        { error: 'У вас не настроен Sipuni номер. Обратитесь к администратору.' },
        { status: 400 }
      );
    }

    // Clean phone number — keep only digits
    const cleanPhone = phone.replace(/\D/g, '');

    const params: Record<string, string> = {
      antiaon: '',
      phone: cleanPhone,
      reverse: '0',
      sipnumber: user.sipNumber,
      user: SIPUNI_USER,
    };

    const hash = sipuniHash(params);

    const url = new URL('https://sipuni.com/api/callback/call_number');
    url.searchParams.set('user', SIPUNI_USER);
    url.searchParams.set('phone', cleanPhone);
    url.searchParams.set('sipnumber', user.sipNumber);
    url.searchParams.set('reverse', '0');
    url.searchParams.set('antiaon', '');
    url.searchParams.set('hash', hash);

    const response = await fetch(url.toString(), { method: 'GET' });
    const data = await response.text();

    let result;
    try {
      result = JSON.parse(data);
    } catch {
      result = { raw: data };
    }

    if (result.result === 'error') {
      return NextResponse.json({ error: result.data || 'Sipuni error' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Sipuni call error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
