import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;

const connectionString = 'postgresql://mz@localhost:5432/ertis_classroom?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

console.log('Checking Prisma client...');
console.log('prisma.branch:', typeof prisma.branch);
console.log('prisma.taskSubject:', typeof prisma.taskSubject);
console.log('prisma.scheduleSlot:', typeof prisma.scheduleSlot);

// Try to use it
try {
  const count = await prisma.branch.count();
  console.log('\n✓ Branch model works! Count:', count);
} catch (e) {
  console.error('\n✗ Error:', e.message);
}

await prisma.$disconnect();
