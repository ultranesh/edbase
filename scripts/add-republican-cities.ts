import { prisma } from "../lib/prisma";

// Cities of republican significance (города республиканского значения)
const republicanCities = [
  { code: "01kz", nameKz: "Астана", nameRu: "Астана", nameEn: "Astana" },
  { code: "02kz", nameKz: "Алматы", nameRu: "Алматы", nameEn: "Almaty" },
  { code: "17kz", nameKz: "Шымкент", nameRu: "Шымкент", nameEn: "Shymkent" },
];

async function main() {
  // Get current max orderIndex
  const maxOrderRegion = await prisma.refRegion.findFirst({
    orderBy: { orderIndex: 'desc' }
  });
  let orderIndex = (maxOrderRegion?.orderIndex ?? -1) + 1;

  console.log("Adding cities of republican significance as regions...\n");

  let created = 0;
  for (const city of republicanCities) {
    try {
      const existing = await prisma.refRegion.findFirst({
        where: { code: city.code }
      });

      if (existing) {
        console.log(`Already exists: ${city.nameRu} (${city.code})`);
        continue;
      }

      await prisma.refRegion.create({
        data: {
          code: city.code,
          name: city.nameRu,
          nameKz: city.nameKz,
          nameRu: city.nameRu,
          nameEn: city.nameEn,
          orderIndex: orderIndex++,
          isActive: true,
        }
      });
      console.log(`Created: ${city.nameRu} (${city.code})`);
      created++;
    } catch (e: any) {
      console.error(`Error creating ${city.nameRu}:`, e.message);
    }
  }

  console.log("\nDone! Created regions:", created);

  // Now update the cities to link to their respective regions
  console.log("\nLinking cities to regions...");

  for (const city of republicanCities) {
    const region = await prisma.refRegion.findFirst({
      where: { code: city.code }
    });

    if (!region) continue;

    const cityRecord = await prisma.refCity.findFirst({
      where: { nameRu: city.nameRu }
    });

    if (cityRecord && !cityRecord.regionId) {
      await prisma.refCity.update({
        where: { id: cityRecord.id },
        data: { regionId: region.id }
      });
      console.log(`Linked city ${city.nameRu} to region ${city.code}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
