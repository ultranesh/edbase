import { UserRole } from '@prisma/client';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    iin?: string | null;
    firstName: string;
    lastName: string;
    role: UserRole;
    avatar?: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      iin?: string | null;
      firstName: string;
      lastName: string;
      role: UserRole;
      avatar?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    iin?: string;
    role: UserRole;
    firstName: string;
    lastName: string;
  }
}
