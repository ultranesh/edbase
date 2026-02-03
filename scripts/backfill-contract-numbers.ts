import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://mz@localhost:5432/ertis_classroom?schema=public' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function generateNextContractNumber(lastNumber: string | null): string {
  if (!lastNumber) return 'AAA-001';

  const [letters, digits] = lastNumber.split('-');
  let num = parseInt(digits, 10) + 1;
  let letterPart = letters;

  if (num > 999) {
    num = 1;
    const chars = letterPart.split('');
    for (let i = 2; i >= 0; i--) {
      if (chars[i] < 'Z') {
        chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
        break;
      } else {
        chars[i] = 'A';
      }
    }
    letterPart = chars.join('');
  }

  return `${letterPart}-${String(num).padStart(3, '0')}`;
}

async function backfill() {
  console.log('Backfilling contract numbers for existing students...\n');

  const students = await prisma.student.findMany({
    where: { contractNumber: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  console.log(`Found ${students.length} students without contract numbers.\n`);

  let lastNumber: string | null = null;

  // Check if any students already have contract numbers
  const lastExisting = await prisma.student.findFirst({
    where: { contractNumber: { not: null } },
    orderBy: { contractNumber: 'desc' },
    select: { contractNumber: true },
  });

  if (lastExisting) {
    lastNumber = lastExisting.contractNumber;
    console.log(`Last existing contract number: ${lastNumber}\n`);
  }

  for (const student of students) {
    const contractNumber = generateNextContractNumber(lastNumber);
    await prisma.student.update({
      where: { id: student.id },
      data: { contractNumber },
    });
    console.log(`  ${student.id} → ${contractNumber}`);
    lastNumber = contractNumber;
  }

  console.log(`\nDone! Assigned ${students.length} contract numbers.`);
  await prisma.$disconnect();
  await pool.end();
}

backfill().catch(console.error);
