import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://mz@localhost:5432/ertis_classroom?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.taskSubject.updateMany({
    data: { icon: null }
  });
  console.log(`Удалено иконок у ${result.count} предметов`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await pool.end();
  });
