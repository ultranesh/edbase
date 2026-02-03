import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { headers } from 'next/headers';
import type { UserRole } from '@prisma/client';

function parseUserAgent(ua: string) {
  let deviceType = 'desktop';
  let browser = 'Unknown';
  let browserVersion = '';
  let os = 'Unknown';
  let deviceModel = '';

  // Device type
  if (/Mobile|Android.*Mobile|iPhone|iPod/.test(ua)) {
    deviceType = 'mobile';
  } else if (/iPad|Android(?!.*Mobile)|Tablet/.test(ua)) {
    deviceType = 'tablet';
  }

  // Browser + version
  if (/Edg\/(\d+[\d.]*)/.test(ua)) {
    browser = 'Edge';
    browserVersion = ua.match(/Edg\/(\d+[\d.]*)/)?.[1] || '';
  } else if (/OPR\/(\d+[\d.]*)/.test(ua)) {
    browser = 'Opera';
    browserVersion = ua.match(/OPR\/(\d+[\d.]*)/)?.[1] || '';
  } else if (/Opera.*Version\/(\d+[\d.]*)/.test(ua)) {
    browser = 'Opera';
    browserVersion = ua.match(/Version\/(\d+[\d.]*)/)?.[1] || '';
  } else if (/YaBrowser\/(\d+[\d.]*)/.test(ua)) {
    browser = 'Yandex';
    browserVersion = ua.match(/YaBrowser\/(\d+[\d.]*)/)?.[1] || '';
  } else if (/SamsungBrowser\/(\d+[\d.]*)/.test(ua)) {
    browser = 'Samsung Internet';
    browserVersion = ua.match(/SamsungBrowser\/(\d+[\d.]*)/)?.[1] || '';
  } else if (/Chrome\/(\d+[\d.]*)/.test(ua)) {
    browser = 'Chrome';
    browserVersion = ua.match(/Chrome\/(\d+[\d.]*)/)?.[1] || '';
  } else if (/Version\/(\d+[\d.]*).*Safari/.test(ua)) {
    browser = 'Safari';
    browserVersion = ua.match(/Version\/(\d+[\d.]*)/)?.[1] || '';
  } else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox\/(\d+[\d.]*)/.test(ua)) {
    browser = 'Firefox';
    browserVersion = ua.match(/Firefox\/(\d+[\d.]*)/)?.[1] || '';
  }

  // OS
  if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) {
    const ver = ua.match(/Mac OS X (\d+[._]\d+)/);
    os = 'macOS' + (ver ? ' ' + ver[1].replace(/_/g, '.') : '');
  } else if (/Android (\d+)/.test(ua)) {
    os = 'Android ' + ua.match(/Android (\d+(\.\d+)?)/)?.[1];
  } else if (/iPhone OS (\d+)/.test(ua) || /iPad.*OS (\d+)/.test(ua)) {
    const ver = ua.match(/OS (\d+[._]\d+)/);
    os = 'iOS' + (ver ? ' ' + ver[1].replace(/_/g, '.') : '');
  } else if (/CrOS/.test(ua)) os = 'Chrome OS';
  else if (/Linux/.test(ua)) os = 'Linux';

  // Device model
  const iphoneMatch = ua.match(/iPhone/);
  const ipadMatch = ua.match(/iPad/);
  const androidMatch = ua.match(/;\s*([^;)]+)\s*Build\//);
  if (iphoneMatch) deviceModel = 'iPhone';
  else if (ipadMatch) deviceModel = 'iPad';
  else if (androidMatch) deviceModel = androidMatch[1].trim();

  return { deviceType, browser, browserVersion, os, deviceModel };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        iin: { label: 'IIN', type: 'text' },
        password: { label: 'Password', type: 'password' },
        switchToken: { label: 'Switch Token', type: 'text' },
        networkType: { label: 'Network Type', type: 'text' },
        screenResolution: { label: 'Screen Resolution', type: 'text' },
        language: { label: 'Language', type: 'text' },
        clientTimezone: { label: 'Timezone', type: 'text' },
        connectionSpeed: { label: 'Connection Speed', type: 'text' },
      },
      authorize: async (credentials) => {
        const iin = credentials?.iin as string;
        const password = credentials?.password as string;
        const switchToken = credentials?.switchToken as string;

        if (!iin || (!password && !switchToken)) {
          throw new Error('IIN and password are required');
        }

        const user = await prisma.user.findUnique({
          where: { iin },
        });

        if (!user || !user.isActive) {
          throw new Error('Invalid credentials');
        }

        // Auth via switchToken (account switching) or password
        if (switchToken) {
          if (!user.switchToken || user.switchToken !== switchToken) {
            throw new Error('Invalid switch token');
          }
        } else {
          const isValidPassword = await bcrypt.compare(password, user.password);
          if (!isValidPassword) {
            throw new Error('Invalid credentials');
          }
        }

        // Generate new switchToken for this user
        const newSwitchToken = crypto.randomUUID();

        // Update last login + switchToken
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date(), switchToken: newSwitchToken },
        });

        // Log login session
        try {
          const headersList = await headers();
          const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
            || headersList.get('x-real-ip')
            || 'unknown';
          const ua = headersList.get('user-agent') || '';
          const parsed = parseUserAgent(ua);

          // Client-side info from credentials
          const networkType = (credentials.networkType as string) || null;
          const screenResolution = (credentials.screenResolution as string) || null;
          const language = (credentials.language as string) || null;
          const clientTimezone = (credentials.clientTimezone as string) || null;
          const connectionSpeed = (credentials.connectionSpeed as string) || null;

          // Fetch full geo/ISP info from IP (best effort)
          let geoData: Record<string, any> = {};
          try {
            if (ip && ip !== 'unknown') {
              const isLocalhost = ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.');
              const fields = 'status,isp,org,as,asname,city,regionName,country,lat,lon,timezone,mobile,proxy,hosting';
              const geoUrl = isLocalhost
                ? `http://ip-api.com/json/?fields=${fields}&lang=ru`
                : `http://ip-api.com/json/${ip}?fields=${fields}&lang=ru`;
              const geoRes = await fetch(geoUrl, {
                signal: AbortSignal.timeout(3000),
              });
              if (geoRes.ok) {
                const geo = await geoRes.json();
                if (geo.status === 'success') {
                  geoData = geo;
                }
              }
            }
          } catch {}

          await prisma.loginSession.create({
            data: {
              userId: user.id,
              ipAddress: ip,
              userAgent: ua,
              deviceType: parsed.deviceType,
              browser: parsed.browser,
              browserVersion: parsed.browserVersion || null,
              os: parsed.os,
              deviceModel: parsed.deviceModel || null,
              network: networkType,
              isp: geoData.isp || null,
              org: geoData.org || null,
              asName: geoData.asname || null,
              city: geoData.city || null,
              regionName: geoData.regionName || null,
              country: geoData.country || null,
              lat: geoData.lat ?? null,
              lon: geoData.lon ?? null,
              timezone: geoData.timezone || null,
              isProxy: geoData.proxy ?? null,
              isHosting: geoData.hosting ?? null,
              isMobileNetwork: geoData.mobile ?? null,
              screenResolution,
              language,
              clientTimezone,
              connectionSpeed,
            },
          });
        } catch (e) {
          console.error('Failed to log session:', e);
        }

        return {
          id: user.id,
          email: user.email,
          iin: user.iin,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatar: user.avatar,
          switchToken: newSwitchToken,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.iin = user.iin;
        token.role = user.role as UserRole;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.switchToken = (user as any).switchToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.iin = token.iin as string;
        session.user.role = token.role as UserRole;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        (session.user as any).switchToken = token.switchToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});
