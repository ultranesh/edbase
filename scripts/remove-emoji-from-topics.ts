import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://mz@localhost:5432/ertis_classroom?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Function to remove emojis from string
function removeEmojis(str: string): string {
  return str.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
}

async function main() {
  // Get all topics
  const topics = await prisma.taskTopic.findMany();
  
  console.log('Found topics:');
  for (const topic of topics) {
    const cleanName = removeEmojis(topic.name);
    if (cleanName !== topic.name) {
      console.log(`  "${topic.name}" -> "${cleanName}"`);
      await prisma.taskTopic.update({
        where: { id: topic.id },
        data: { name: cleanName }
      });
    }
  }
  
  // Get all subtopics
  const subtopics = await prisma.taskSubtopic.findMany();
  
  console.log('\nFound subtopics:');
  for (const subtopic of subtopics) {
    const cleanName = removeEmojis(subtopic.name);
    if (cleanName !== subtopic.name) {
      console.log(`  "${subtopic.name}" -> "${cleanName}"`);
      await prisma.taskSubtopic.update({
        where: { id: subtopic.id },
        data: { name: cleanName }
      });
    }
  }
  
  console.log('\nDone! Emojis removed from topic names.');
}

main()
  .catch(console.error)
  .finally(async () => {
    await pool.end();
  });
