/**
 * Seed catalogue — the canonical copy.
 *
 * Transcribed from the Claude Design board so the shop was built against real
 * content rather than lorem ipsum. Once `npm run seed` has run, MongoDB is
 * the source of truth and the copies in apps/store/src/data/catalogue.ts and
 * apps/admin/src/data/books.ts are deleted.
 *
 * NOTE: these five categories came from the designer's reading of the brief.
 * Confirm the real list before seeding a production database.
 */

export type Bilingual = { fr: string; ar?: string };

export type SeedCategory = {
  slug: string;
  name: Bilingual;
  sortOrder: number;
};

export type SeedBook = {
  slug: string;
  title: Bilingual;
  author: Bilingual;
  summary?: Bilingual;
  categorySlugs: string[];
  priceDzd: number;
  compareAtPriceDzd?: number | null;
  coverTint?: number;
  stockOnHand: number;
  lowStockThreshold: number;
  weightGrams: number;
  isbn?: string;
  publisher?: string;
  pageCount?: number;
  bookLanguage?: "fr" | "ar";
  isNew?: boolean;
  isBestSeller?: boolean;
};

export const seedCategories: SeedCategory[] = [
  { slug: "romans", name: { fr: "Romans", ar: "روايات" }, sortOrder: 1 },
  { slug: "jeunesse", name: { fr: "Jeunesse", ar: "أطفال" }, sortOrder: 2 },
  { slug: "histoire", name: { fr: "Histoire", ar: "تاريخ" }, sortOrder: 3 },
  {
    slug: "langue-arabe",
    name: { fr: "Langue arabe", ar: "اللغة العربية" },
    sortOrder: 4,
  },
  { slug: "poesie", name: { fr: "Poésie", ar: "شعر" }, sortOrder: 5 },
];

export const seedBooks: SeedBook[] = [
  {
    slug: "meursault-contre-enquete",
    title: { fr: "Meursault, contre-enquête" },
    author: { fr: "Kamel Daoud", ar: "كمال داود" },
    summary: {
      fr: "Le frère de « l'Arabe » tué sur une plage d'Alger reprend le récit et lui rend un nom. Un contre-chant lucide, écrit dans une langue tendue.",
      ar: "شقيق «العربي» الذي قُتل على شاطئ الجزائر يستعيد الحكاية ويمنحه اسماً. نصّ مضادّ بلغة مشدودة.",
    },
    categorySlugs: ["romans"],
    priceDzd: 135000,
    compareAtPriceDzd: 170000,
    coverTint: 0,
    stockOnHand: 12,
    lowStockThreshold: 3,
    weightGrams: 240,
    isbn: "978-9931-325-03-8",
    publisher: "Barzakh",
    pageCount: 160,
    bookLanguage: "fr",
    isNew: true,
  },
  {
    slug: "les-chercheurs-d-os",
    title: { fr: "Les Chercheurs d'os" },
    author: { fr: "Tahar Djaout", ar: "الطاهر جعوط" },
    categorySlugs: ["romans"],
    priceDzd: 120000,
    coverTint: 1,
    stockOnHand: 9,
    lowStockThreshold: 3,
    weightGrams: 240,
    bookLanguage: "fr",
    isNew: true,
  },
  {
    slug: "nedjma",
    title: { fr: "Nedjma" },
    author: { fr: "Kateb Yacine", ar: "كاتب ياسين" },
    categorySlugs: ["romans"],
    priceDzd: 145000,
    coverTint: 2,
    stockOnHand: 7,
    lowStockThreshold: 3,
    weightGrams: 300,
    bookLanguage: "fr",
    isNew: true,
  },
  {
    slug: "rih-el-djanoub",
    title: { fr: "Rih El Djanoub", ar: "ريح الجنوب" },
    author: { fr: "Abdelhamid Benhedouga", ar: "عبد الحميد بن هدوقة" },
    categorySlugs: ["romans", "langue-arabe"],
    priceDzd: 98000,
    coverTint: 3,
    stockOnHand: 15,
    lowStockThreshold: 3,
    weightGrams: 280,
    bookLanguage: "ar",
    isNew: true,
  },
  {
    slug: "le-fils-du-pauvre",
    title: { fr: "Le Fils du pauvre" },
    author: { fr: "Mouloud Feraoun", ar: "مولود فرعون" },
    categorySlugs: ["romans"],
    priceDzd: 95000,
    coverTint: 4,
    stockOnHand: 21,
    lowStockThreshold: 3,
    weightGrams: 250,
    bookLanguage: "fr",
    isBestSeller: true,
  },
  {
    slug: "ce-que-le-jour-doit-a-la-nuit",
    title: { fr: "Ce que le jour doit à la nuit" },
    author: { fr: "Yasmina Khadra", ar: "ياسمينة خضرا" },
    categorySlugs: ["romans"],
    priceDzd: 180000,
    coverTint: 1,
    // drives the "Plus que 3 exemplaires" state on the board
    stockOnHand: 3,
    lowStockThreshold: 3,
    weightGrams: 420,
    bookLanguage: "fr",
    isBestSeller: true,
  },
  {
    slug: "la-grande-maison",
    title: { fr: "La Grande Maison" },
    author: { fr: "Mohammed Dib", ar: "محمد ديب" },
    categorySlugs: ["romans"],
    priceDzd: 110000,
    coverTint: 2,
    stockOnHand: 14,
    lowStockThreshold: 3,
    weightGrams: 270,
    bookLanguage: "fr",
    isBestSeller: true,
  },
  {
    slug: "l-amour-la-fantasia",
    title: { fr: "L'Amour, la fantasia" },
    author: { fr: "Assia Djebar", ar: "آسيا جبار" },
    categorySlugs: ["romans", "histoire"],
    priceDzd: 130000,
    coverTint: 0,
    // drives the "Rupture de stock" state on the board
    stockOnHand: 0,
    lowStockThreshold: 3,
    weightGrams: 310,
    bookLanguage: "fr",
    isBestSeller: true,
  },
  // "Du même auteur" rail on S4
  {
    slug: "zabor",
    title: { fr: "Zabor ou Les psaumes" },
    author: { fr: "Kamel Daoud", ar: "كمال داود" },
    categorySlugs: ["romans"],
    priceDzd: 150000,
    coverTint: 2,
    stockOnHand: 8,
    lowStockThreshold: 3,
    weightGrams: 330,
    publisher: "Barzakh",
    bookLanguage: "fr",
  },
  {
    slug: "le-peintre-devorant-la-femme",
    title: { fr: "Le Peintre dévorant la femme" },
    author: { fr: "Kamel Daoud", ar: "كمال داود" },
    categorySlugs: ["romans"],
    priceDzd: 125000,
    coverTint: 4,
    stockOnHand: 5,
    lowStockThreshold: 3,
    weightGrams: 210,
    bookLanguage: "fr",
  },
  {
    slug: "mes-independances",
    title: { fr: "Mes indépendances" },
    author: { fr: "Kamel Daoud", ar: "كمال داود" },
    categorySlugs: ["romans", "histoire"],
    priceDzd: 170000,
    coverTint: 3,
    stockOnHand: 6,
    lowStockThreshold: 3,
    weightGrams: 450,
    bookLanguage: "fr",
  },
  // catalogue depth for S2 / S3, also from the board
  {
    slug: "la-colline-oubliee",
    title: { fr: "La Colline oubliée" },
    author: { fr: "Mouloud Mammeri", ar: "مولود معمري" },
    categorySlugs: ["romans"],
    priceDzd: 115000,
    coverTint: 1,
    stockOnHand: 11,
    lowStockThreshold: 3,
    weightGrams: 290,
    bookLanguage: "fr",
  },
  {
    slug: "l-opium-et-le-baton",
    title: { fr: "L'Opium et le Bâton" },
    author: { fr: "Mouloud Mammeri", ar: "مولود معمري" },
    categorySlugs: ["romans", "histoire"],
    priceDzd: 125000,
    coverTint: 3,
    stockOnHand: 4,
    lowStockThreshold: 3,
    weightGrams: 340,
    bookLanguage: "fr",
  },
  {
    slug: "le-village-de-l-allemand",
    title: { fr: "Le Village de l'Allemand" },
    author: { fr: "Boualem Sansal", ar: "بوعلام صنصال" },
    categorySlugs: ["romans"],
    priceDzd: 160000,
    coverTint: 0,
    stockOnHand: 6,
    lowStockThreshold: 3,
    weightGrams: 380,
    bookLanguage: "fr",
  },
  {
    slug: "l-incendie",
    title: { fr: "L'Incendie" },
    author: { fr: "Mohammed Dib", ar: "محمد ديب" },
    categorySlugs: ["romans"],
    priceDzd: 110000,
    coverTint: 2,
    stockOnHand: 9,
    lowStockThreshold: 3,
    weightGrams: 260,
    bookLanguage: "fr",
  },
  {
    slug: "el-laz",
    title: { fr: "El Laz", ar: "اللاز" },
    author: { fr: "Tahar Ouettar", ar: "الطاهر وطار" },
    categorySlugs: ["romans", "langue-arabe"],
    priceDzd: 99000,
    coverTint: 4,
    stockOnHand: 13,
    lowStockThreshold: 3,
    weightGrams: 300,
    bookLanguage: "ar",
  },
  {
    slug: "la-repudiation",
    title: { fr: "La Répudiation" },
    author: { fr: "Rachid Boudjedra", ar: "رشيد بوجدرة" },
    categorySlugs: ["romans"],
    priceDzd: 125000,
    coverTint: 1,
    stockOnHand: 7,
    lowStockThreshold: 3,
    weightGrams: 280,
    bookLanguage: "fr",
  },
];
