import { prisma } from "../lib/prisma";

// Map city names to their region codes
const cityToRegion: Record<string, string> = {
  // Республиканского значения - нет области, оставим без regionId
  "Астана": "",
  "Алматы": "",
  "Шымкент": "",

  // Акмолинская область (03kz)
  "Кокшетау": "03kz",

  // Актюбинская область (04kz)
  "Актобе": "04kz",

  // Атырауская область (06kz)
  "Атырау": "06kz",

  // Западно-Казахстанская область (07kz)
  "Уральск": "07kz",

  // Жамбылская область (08kz)
  "Тараз": "08kz",

  // Карагандинская область (09kz)
  "Караганда": "09kz",

  // Костанайская область (10kz)
  "Костанай": "10kz",

  // Кызылординская область (11kz)
  "Кызылорда": "11kz",

  // Мангистауская область (12kz)
  "Актау": "12kz",

  // Туркестанская область (13kz)
  "Туркестан": "13kz",

  // Павлодарская область (14kz)
  "Павлодар": "14kz",

  // Северо-Казахстанская область (15kz)
  "Петропавловск": "15kz",

  // Восточно-Казахстанская область (16kz)
  "Усть-Каменогорск": "16kz",

  // Область Абай (18kz)
  "Семей": "18kz",

  // Область Жетісу (19kz)
  "Талдыкорган": "19kz",
};

async function main() {
  // Get all regions
  const regions = await prisma.refRegion.findMany();
  const regionMap = new Map(regions.map(r => [r.code, r.id]));

  console.log("Found regions:", regions.length);

  // Get all cities without regionId
  const citiesWithoutRegion = await prisma.refCity.findMany({
    where: { regionId: null }
  });

  console.log("Cities without region:", citiesWithoutRegion.length);

  let updated = 0;
  for (const city of citiesWithoutRegion) {
    const regionCode = cityToRegion[city.nameRu || city.name];

    if (regionCode === undefined) {
      console.log("Unknown city:", city.nameRu || city.name);
      continue;
    }

    if (regionCode === "") {
      console.log("City of republican significance (no region):", city.nameRu || city.name);
      continue;
    }

    const regionId = regionMap.get(regionCode);
    if (!regionId) {
      console.log("Region not found:", regionCode);
      continue;
    }

    await prisma.refCity.update({
      where: { id: city.id },
      data: { regionId: regionId }
    });

    console.log("Updated:", city.nameRu || city.name, "-> region", regionCode);
    updated++;
  }

  console.log("\nDone! Updated cities:", updated);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
