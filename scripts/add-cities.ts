import { prisma } from "../lib/prisma";

const cities = [
  // Акмолинская область (03kz)
  { regionCode: "03kz", code: "kokshetau", nameKz: "Көкшетау", nameRu: "Кокшетау", nameEn: "Kokshetau" },
  { regionCode: "03kz", code: "stepnogorsk", nameKz: "Степногорск", nameRu: "Степногорск", nameEn: "Stepnogorsk" },
  { regionCode: "03kz", code: "shchuchinsk", nameKz: "Щучинск", nameRu: "Щучинск", nameEn: "Shchuchinsk" },

  // Актюбинская область (04kz)
  { regionCode: "04kz", code: "aktobe", nameKz: "Ақтөбе", nameRu: "Актобе", nameEn: "Aktobe" },
  { regionCode: "04kz", code: "khromtau", nameKz: "Хромтау", nameRu: "Хромтау", nameEn: "Khromtau" },
  { regionCode: "04kz", code: "alga", nameKz: "Алға", nameRu: "Алга", nameEn: "Alga" },

  // Алматинская область (05kz)
  { regionCode: "05kz", code: "konayev", nameKz: "Қонаев", nameRu: "Конаев", nameEn: "Konayev" },
  { regionCode: "05kz", code: "talgar", nameKz: "Талғар", nameRu: "Талгар", nameEn: "Talgar" },
  { regionCode: "05kz", code: "esik", nameKz: "Есік", nameRu: "Есик", nameEn: "Esik" },
  { regionCode: "05kz", code: "kaskelen", nameKz: "Қаскелең", nameRu: "Каскелен", nameEn: "Kaskelen" },

  // Атырауская область (06kz)
  { regionCode: "06kz", code: "atyrau", nameKz: "Атырау", nameRu: "Атырау", nameEn: "Atyrau" },
  { regionCode: "06kz", code: "kulsary", nameKz: "Құлсары", nameRu: "Кульсары", nameEn: "Kulsary" },

  // Западно-Казахстанская область (07kz)
  { regionCode: "07kz", code: "oral", nameKz: "Орал", nameRu: "Уральск", nameEn: "Oral" },
  { regionCode: "07kz", code: "aksai", nameKz: "Ақсай", nameRu: "Аксай", nameEn: "Aksai" },

  // Жамбылская область (08kz)
  { regionCode: "08kz", code: "taraz", nameKz: "Тараз", nameRu: "Тараз", nameEn: "Taraz" },
  { regionCode: "08kz", code: "karatau", nameKz: "Қаратау", nameRu: "Каратау", nameEn: "Karatau" },
  { regionCode: "08kz", code: "shu", nameKz: "Шу", nameRu: "Шу", nameEn: "Shu" },

  // Карагандинская область (09kz)
  { regionCode: "09kz", code: "karaganda", nameKz: "Қарағанды", nameRu: "Караганда", nameEn: "Karaganda" },
  { regionCode: "09kz", code: "temirtau", nameKz: "Теміртау", nameRu: "Темиртау", nameEn: "Temirtau" },
  { regionCode: "09kz", code: "shakhtinsk", nameKz: "Шахтинск", nameRu: "Шахтинск", nameEn: "Shakhtinsk" },
  { regionCode: "09kz", code: "saran", nameKz: "Саран", nameRu: "Сарань", nameEn: "Saran" },
  { regionCode: "09kz", code: "balkhash", nameKz: "Балқаш", nameRu: "Балхаш", nameEn: "Balkhash" },

  // Костанайская область (10kz)
  { regionCode: "10kz", code: "kostanay", nameKz: "Қостанай", nameRu: "Костанай", nameEn: "Kostanay" },
  { regionCode: "10kz", code: "rudny", nameKz: "Рудный", nameRu: "Рудный", nameEn: "Rudny" },
  { regionCode: "10kz", code: "lisakovsk", nameKz: "Лисаковск", nameRu: "Лисаковск", nameEn: "Lisakovsk" },
  { regionCode: "10kz", code: "arkalyk", nameKz: "Арқалық", nameRu: "Аркалык", nameEn: "Arkalyk" },

  // Кызылординская область (11kz)
  { regionCode: "11kz", code: "kyzylorda", nameKz: "Қызылорда", nameRu: "Кызылорда", nameEn: "Kyzylorda" },
  { regionCode: "11kz", code: "baikonur", nameKz: "Байқоңыр", nameRu: "Байконур", nameEn: "Baikonur" },
  { regionCode: "11kz", code: "aralsk", nameKz: "Арал", nameRu: "Аральск", nameEn: "Aralsk" },

  // Мангистауская область (12kz)
  { regionCode: "12kz", code: "aktau", nameKz: "Ақтау", nameRu: "Актау", nameEn: "Aktau" },
  { regionCode: "12kz", code: "zhanaozen", nameKz: "Жаңаөзен", nameRu: "Жанаозен", nameEn: "Zhanaozen" },

  // Туркестанская область (13kz)
  { regionCode: "13kz", code: "turkestan", nameKz: "Түркістан", nameRu: "Туркестан", nameEn: "Turkestan" },
  { regionCode: "13kz", code: "kentau", nameKz: "Кентау", nameRu: "Кентау", nameEn: "Kentau" },
  { regionCode: "13kz", code: "arys", nameKz: "Арыс", nameRu: "Арысь", nameEn: "Arys" },
  { regionCode: "13kz", code: "saryagash", nameKz: "Сарыағаш", nameRu: "Сарыагаш", nameEn: "Saryagash" },

  // Павлодарская область (14kz)
  { regionCode: "14kz", code: "pavlodar", nameKz: "Павлодар", nameRu: "Павлодар", nameEn: "Pavlodar" },
  { regionCode: "14kz", code: "ekibastuz", nameKz: "Екібастұз", nameRu: "Экибастуз", nameEn: "Ekibastuz" },
  { regionCode: "14kz", code: "aksu", nameKz: "Ақсу", nameRu: "Аксу", nameEn: "Aksu" },

  // Северо-Казахстанская область (15kz)
  { regionCode: "15kz", code: "petropavlovsk", nameKz: "Петропавл", nameRu: "Петропавловск", nameEn: "Petropavlovsk" },

  // Восточно-Казахстанская область (16kz)
  { regionCode: "16kz", code: "oskemen", nameKz: "Өскемен", nameRu: "Усть-Каменогорск", nameEn: "Oskemen" },
  { regionCode: "16kz", code: "ridder", nameKz: "Риддер", nameRu: "Риддер", nameEn: "Ridder" },
  { regionCode: "16kz", code: "altai", nameKz: "Алтай", nameRu: "Алтай", nameEn: "Altai" },

  // Область Абай (18kz)
  { regionCode: "18kz", code: "semey", nameKz: "Семей", nameRu: "Семей", nameEn: "Semey" },
  { regionCode: "18kz", code: "kurchatov", nameKz: "Құрчатов", nameRu: "Курчатов", nameEn: "Kurchatov" },

  // Область Жетісу (19kz)
  { regionCode: "19kz", code: "taldykorgan", nameKz: "Талдықорған", nameRu: "Талдыкорган", nameEn: "Taldykorgan" },
  { regionCode: "19kz", code: "tekeli", nameKz: "Текелі", nameRu: "Текели", nameEn: "Tekeli" },

  // Область Ұлытау (20kz)
  { regionCode: "20kz", code: "zhezkazgan", nameKz: "Жезқазған", nameRu: "Жезказган", nameEn: "Zhezkazgan" },
  { regionCode: "20kz", code: "satpayev", nameKz: "Сәтбаев", nameRu: "Сатпаев", nameEn: "Satpayev" },
  { regionCode: "20kz", code: "karazhal", nameKz: "Қаражал", nameRu: "Каражал", nameEn: "Karazhal" },
];

async function main() {
  // Get all regions
  const regions = await prisma.refRegion.findMany();
  const regionMap = new Map(regions.map(r => [r.code, r.id]));

  console.log("Found regions:", regions.length);

  let orderIndex = 0;
  let created = 0;
  for (const city of cities) {
    const regionId = regionMap.get(city.regionCode);
    if (!regionId) {
      console.log("Region not found:", city.regionCode);
      continue;
    }

    try {
      await prisma.refCity.create({
        data: {
          code: city.code,
          name: city.nameRu,
          nameKz: city.nameKz,
          nameRu: city.nameRu,
          nameEn: city.nameEn,
          regionId: regionId,
          orderIndex: orderIndex++,
          isActive: true,
        }
      });
      console.log("Created:", city.nameRu, "in region", city.regionCode);
      created++;
    } catch (e: any) {
      if (e.code === "P2002") {
        console.log("Already exists:", city.nameRu);
        orderIndex++;
      } else {
        console.error("Error creating", city.nameRu, e.message);
      }
    }
  }

  console.log("\nDone! Total cities created:", created);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
