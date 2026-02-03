import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// MarSIP Call API - использует НАШУ SIP систему через Janus WebRTC Gateway
// НЕ использует внешний sipuni.com!

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phone, leadId } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Номер телефона обязателен' }, { status: 400 });
    }

    // Получаем MarSIP конфигурацию
    const marsipConfig = await prisma.marSipConfig.findFirst({
      where: { isActive: true },
    });

    if (!marsipConfig) {
      return NextResponse.json(
        { error: 'MarSIP не настроен. Обратитесь к администратору.' },
        { status: 400 }
      );
    }

    // Получаем SIP extension пользователя из MarSIP
    const extension = await prisma.marSipExtension.findFirst({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    });

    if (!extension) {
      return NextResponse.json(
        { error: 'У вас не назначен MarSIP номер. Обратитесь к администратору.' },
        { status: 400 }
      );
    }

    // Очищаем номер телефона
    let cleanPhone = phone.replace(/\D/g, '');

    // Если номер начинается с 8, заменяем на 7 (Казахстан)
    if (cleanPhone.startsWith('8') && cleanPhone.length === 11) {
      cleanPhone = '7' + cleanPhone.slice(1);
    }

    // Добавляем 7 если номер без кода страны
    if (cleanPhone.length === 10) {
      cleanPhone = '7' + cleanPhone;
    }

    // Если leadId не передан, пытаемся найти заявку по номеру телефона
    let foundLeadId = leadId;
    if (!foundLeadId) {
      // Ищем заявку по номеру телефона (проверяем и phone, и parentPhone)
      const phoneVariants = [
        cleanPhone,
        '+' + cleanPhone,
        '8' + cleanPhone.slice(1), // Вариант с 8
        '+7' + cleanPhone.slice(1),
      ];

      const lead = await prisma.crmLead.findFirst({
        where: {
          OR: [
            { phone: { in: phoneVariants } },
            { parentPhone: { in: phoneVariants } },
          ],
        },
        select: { id: true },
      });

      if (lead) {
        foundLeadId = lead.id;
      }
    }

    // Создаём запись о звонке в базе
    const callLog = await prisma.marSipCall.create({
      data: {
        leadId: foundLeadId || null,
        userId: session.user.id,
        callerNumber: extension.extensionNumber,
        receiverNumber: cleanPhone,
        extensionNumber: extension.extensionNumber,
        direction: 'OUTGOING',
        status: 'INITIATED',
        startedAt: new Date(),
      },
    });

    // Возвращаем данные для инициации звонка через WebRTC на клиенте
    // Звонок будет выполнен через Janus WebRTC Gateway
    return NextResponse.json({
      success: true,
      callId: callLog.id,
      leadId: foundLeadId || null, // Возвращаем leadId если нашли заявку по номеру
      sipConfig: {
        server: marsipConfig.sipServer,
        port: marsipConfig.sipPort,
        // Учётные данные extension пользователя
        username: extension.extensionNumber,
        password: extension.sipPassword,
        // Номер для звонка
        targetNumber: cleanPhone,
        // Janus WebSocket endpoint
        janusWs: `wss://${marsipConfig.sipServer.replace('almpbx.tele2.kz', '185.129.48.82')}/janus-ws`,
      },
      extension: {
        number: extension.extensionNumber,
        displayName: extension.displayName,
      },
    });
  } catch (error) {
    console.error('MarSIP call error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// GET - получить историю звонков пользователя
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {
      userId: session.user.id,
    };

    if (leadId) {
      where.leadId = leadId;
    }

    const calls = await prisma.marSipCall.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(calls);
  } catch (error) {
    console.error('Get calls error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// PUT - обновить статус звонка
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { callId, status, endedAt, answeredAt, duration, recordingUrl } = body;

    if (!callId) {
      return NextResponse.json({ error: 'callId обязателен' }, { status: 400 });
    }

    const call = await prisma.marSipCall.findUnique({
      where: { id: callId },
    });

    if (!call) {
      return NextResponse.json({ error: 'Звонок не найден' }, { status: 404 });
    }

    if (call.userId !== session.user.id) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const updated = await prisma.marSipCall.update({
      where: { id: callId },
      data: {
        status: status || call.status,
        endedAt: endedAt ? new Date(endedAt) : call.endedAt,
        answeredAt: answeredAt ? new Date(answeredAt) : call.answeredAt,
        duration: duration ?? call.duration,
        recordingUrl: recordingUrl ?? call.recordingUrl,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update call error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
