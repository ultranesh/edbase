import { prisma } from "../lib/prisma";

// IATA airport codes for Kazakhstan cities
const cityIataCodes: Record<string, string> = {
  // Cities with IATA codes (by Russian name)
  "Алматы": "ALA",
  "Астана": "NQZ",
  "Шымкент": "CIT",
  "Актобе": "AKX",
  "Атырау": "GUW",
  "Караганда": "KGF",
  "Костанай": "KSN",
  "Кызылорда": "KZO",
  "Павлодар": "PWQ",
  "Петропавловск": "PPK",
  "Семей": "PLX",
  "Усть-Каменогорск": "UKK",
  "Актау": "SCO",
  "Уральск": "URA",
  "Тараз": "DMB",
  "Кокшетау": "KOV",
  "Жезказган": "DZN",
  "Балхаш": "BXH",
  "Талдыкорган": "TDK",
  "Туркестан": "HSA",
  "Байконур": "BXY",
  "Экибастуз": "EKB",
};

async function main() {
  const cities = await prisma.refCity.findMany();

  console.log("Found cities:", cities.length);

  let updated = 0;
  for (const city of cities) {
    const cityName = city.nameRu || city.name;
    const iataCode = cityIataCodes[cityName];

    if (iataCode && city.code !== iataCode) {
      await prisma.refCity.update({
        where: { id: city.id },
        data: { code: iataCode }
      });
      console.log(`Updated: ${cityName} -> ${iataCode} (was: ${city.code})`);
      updated++;
    }
  }

  console.log("\nDone! Updated cities:", updated);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
