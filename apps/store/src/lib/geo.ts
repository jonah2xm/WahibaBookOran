/**
 * Algerian geography + delivery pricing.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ PLACEHOLDER DATA — REPLACE BEFORE LAUNCH                             │
 * │                                                                      │
 * │ The 58 wilayas below are real. The communes are NOT complete: there  │
 * │ are ~1 541 communes in Algeria and this file carries a handful per   │
 * │ wilaya, with the chef-lieu standing in for the rest. The fee table   │
 * │ is a zone approximation, not Yalidine's tariff.                      │
 * │                                                                      │
 * │ All three come from the Yalidine API once credentials exist:         │
 * │   GET /wilayas · GET /communes · GET /deliveryfees                   │
 * │ Swap `src/app/api/quote/route.ts` to call it and cache into Mongo;   │
 * │ nothing in the UI needs to change.                                   │
 * └──────────────────────────────────────────────────────────────────────┘
 */

import type { Bilingual } from "./types";

export type Wilaya = { id: number; name: Bilingual; zone: 0 | 1 | 2 | 3 | 4 };
export type Commune = { id: number; wilayaId: number; name: Bilingual };
export type Center = {
  id: number;
  wilayaId: number;
  name: Bilingual;
  address: Bilingual;
  hours: string;
};

export const wilayas: Wilaya[] = [
  { id: 1, name: { fr: "Adrar", ar: "أدرار" }, zone: 3 },
  { id: 2, name: { fr: "Chlef", ar: "الشلف" }, zone: 1 },
  { id: 3, name: { fr: "Laghouat", ar: "الأغواط" }, zone: 2 },
  { id: 4, name: { fr: "Oum El Bouaghi", ar: "أم البواقي" }, zone: 1 },
  { id: 5, name: { fr: "Batna", ar: "باتنة" }, zone: 1 },
  { id: 6, name: { fr: "Béjaïa", ar: "بجاية" }, zone: 1 },
  { id: 7, name: { fr: "Biskra", ar: "بسكرة" }, zone: 2 },
  { id: 8, name: { fr: "Béchar", ar: "بشار" }, zone: 3 },
  { id: 9, name: { fr: "Blida", ar: "البليدة" }, zone: 1 },
  { id: 10, name: { fr: "Bouira", ar: "البويرة" }, zone: 1 },
  { id: 11, name: { fr: "Tamanrasset", ar: "تمنراست" }, zone: 4 },
  { id: 12, name: { fr: "Tébessa", ar: "تبسة" }, zone: 1 },
  { id: 13, name: { fr: "Tlemcen", ar: "تلمسان" }, zone: 0 },
  { id: 14, name: { fr: "Tiaret", ar: "تيارت" }, zone: 2 },
  { id: 15, name: { fr: "Tizi Ouzou", ar: "تيزي وزو" }, zone: 1 },
  { id: 16, name: { fr: "Alger", ar: "الجزائر" }, zone: 1 },
  { id: 17, name: { fr: "Djelfa", ar: "الجلفة" }, zone: 2 },
  { id: 18, name: { fr: "Jijel", ar: "جيجل" }, zone: 1 },
  { id: 19, name: { fr: "Sétif", ar: "سطيف" }, zone: 1 },
  { id: 20, name: { fr: "Saïda", ar: "سعيدة" }, zone: 2 },
  { id: 21, name: { fr: "Skikda", ar: "سكيكدة" }, zone: 1 },
  { id: 22, name: { fr: "Sidi Bel Abbès", ar: "سيدي بلعباس" }, zone: 0 },
  { id: 23, name: { fr: "Annaba", ar: "عنابة" }, zone: 1 },
  { id: 24, name: { fr: "Guelma", ar: "قالمة" }, zone: 1 },
  { id: 25, name: { fr: "Constantine", ar: "قسنطينة" }, zone: 1 },
  { id: 26, name: { fr: "Médéa", ar: "المدية" }, zone: 1 },
  { id: 27, name: { fr: "Mostaganem", ar: "مستغانم" }, zone: 0 },
  { id: 28, name: { fr: "M'Sila", ar: "المسيلة" }, zone: 2 },
  { id: 29, name: { fr: "Mascara", ar: "معسكر" }, zone: 0 },
  { id: 30, name: { fr: "Ouargla", ar: "ورقلة" }, zone: 3 },
  { id: 31, name: { fr: "Oran", ar: "وهران" }, zone: 0 },
  { id: 32, name: { fr: "El Bayadh", ar: "البيض" }, zone: 2 },
  { id: 33, name: { fr: "Illizi", ar: "إليزي" }, zone: 4 },
  { id: 34, name: { fr: "Bordj Bou Arréridj", ar: "برج بوعريريج" }, zone: 1 },
  { id: 35, name: { fr: "Boumerdès", ar: "بومرداس" }, zone: 1 },
  { id: 36, name: { fr: "El Tarf", ar: "الطارف" }, zone: 1 },
  { id: 37, name: { fr: "Tindouf", ar: "تندوف" }, zone: 3 },
  { id: 38, name: { fr: "Tissemsilt", ar: "تيسمسيلت" }, zone: 2 },
  { id: 39, name: { fr: "El Oued", ar: "الوادي" }, zone: 3 },
  { id: 40, name: { fr: "Khenchela", ar: "خنشلة" }, zone: 1 },
  { id: 41, name: { fr: "Souk Ahras", ar: "سوق أهراس" }, zone: 1 },
  { id: 42, name: { fr: "Tipaza", ar: "تيبازة" }, zone: 1 },
  { id: 43, name: { fr: "Mila", ar: "ميلة" }, zone: 1 },
  { id: 44, name: { fr: "Aïn Defla", ar: "عين الدفلى" }, zone: 1 },
  { id: 45, name: { fr: "Naâma", ar: "النعامة" }, zone: 2 },
  { id: 46, name: { fr: "Aïn Témouchent", ar: "عين تموشنت" }, zone: 0 },
  { id: 47, name: { fr: "Ghardaïa", ar: "غرداية" }, zone: 3 },
  { id: 48, name: { fr: "Relizane", ar: "غليزان" }, zone: 0 },
  { id: 49, name: { fr: "Timimoun", ar: "تيميمون" }, zone: 3 },
  { id: 50, name: { fr: "Bordj Badji Mokhtar", ar: "برج باجي مختار" }, zone: 4 },
  { id: 51, name: { fr: "Ouled Djellal", ar: "أولاد جلال" }, zone: 3 },
  { id: 52, name: { fr: "Béni Abbès", ar: "بني عباس" }, zone: 3 },
  { id: 53, name: { fr: "In Salah", ar: "عين صالح" }, zone: 4 },
  { id: 54, name: { fr: "In Guezzam", ar: "عين قزام" }, zone: 4 },
  { id: 55, name: { fr: "Touggourt", ar: "تقرت" }, zone: 3 },
  { id: 56, name: { fr: "Djanet", ar: "جانت" }, zone: 4 },
  { id: 57, name: { fr: "El M'Ghair", ar: "المغير" }, zone: 3 },
  { id: 58, name: { fr: "El Meniaa", ar: "المنيعة" }, zone: 3 },
];

/** Real communes for the wilayas we ship to most; elsewhere the chef-lieu. */
const COMMUNES: Record<number, Bilingual[]> = {
  31: [
    { fr: "Oran", ar: "وهران" },
    { fr: "Bir El Djir", ar: "بئر الجير" },
    { fr: "Es Sénia", ar: "السانية" },
    { fr: "Aïn El Turck", ar: "عين الترك" },
    { fr: "Arzew", ar: "أرزيو" },
    { fr: "Bethioua", ar: "بطيوة" },
    { fr: "Gdyel", ar: "قديل" },
    { fr: "Sidi Chami", ar: "سيدي الشحمي" },
  ],
  16: [
    { fr: "Alger Centre", ar: "الجزائر الوسطى" },
    { fr: "Bab Ezzouar", ar: "باب الزوار" },
    { fr: "El Harrach", ar: "الحراش" },
    { fr: "Hussein Dey", ar: "حسين داي" },
    { fr: "Dar El Beïda", ar: "الدار البيضاء" },
    { fr: "Birtouta", ar: "بئر توتة" },
    { fr: "Chéraga", ar: "الشراقة" },
  ],
  25: [
    { fr: "Constantine", ar: "قسنطينة" },
    { fr: "El Khroub", ar: "الخروب" },
    { fr: "Aïn Smara", ar: "عين سمارة" },
    { fr: "Didouche Mourad", ar: "ديدوش مراد" },
  ],
  23: [
    { fr: "Annaba", ar: "عنابة" },
    { fr: "El Bouni", ar: "البوني" },
    { fr: "Sidi Amar", ar: "سيدي عمار" },
  ],
  19: [
    { fr: "Sétif", ar: "سطيف" },
    { fr: "El Eulma", ar: "العلمة" },
    { fr: "Aïn Oulmène", ar: "عين ولمان" },
  ],
  9: [
    { fr: "Blida", ar: "البليدة" },
    { fr: "Boufarik", ar: "بوفاريك" },
    { fr: "Larbaa", ar: "الأربعاء" },
  ],
  13: [
    { fr: "Tlemcen", ar: "تلمسان" },
    { fr: "Maghnia", ar: "مغنية" },
    { fr: "Remchi", ar: "الرمشي" },
  ],
  6: [
    { fr: "Béjaïa", ar: "بجاية" },
    { fr: "Akbou", ar: "أقبو" },
    { fr: "El Kseur", ar: "القصر" },
  ],
};

export const communes: Commune[] = wilayas.flatMap((w) => {
  const list = COMMUNES[w.id] ?? [w.name];
  return list.map((name, i) => ({
    id: w.id * 1000 + i,
    wilayaId: w.id,
    name,
  }));
});

export function communesOf(wilayaId: number) {
  return communes.filter((c) => c.wilayaId === wilayaId);
}

export const centers: Center[] = [
  {
    id: 1,
    wilayaId: 31,
    name: { fr: "Agence Oran — Es Sénia", ar: "وكالة وهران — السانية" },
    address: {
      fr: "Rue Cheikh Larbi Tébessi",
      ar: "شارع الشيخ العربي التبسي",
    },
    hours: "08h–17h",
  },
  {
    id: 2,
    wilayaId: 16,
    name: { fr: "Agence Alger — Bab Ezzouar", ar: "وكالة الجزائر — باب الزوار" },
    address: { fr: "Cité 5 Juillet", ar: "حي 5 جويلية" },
    hours: "08h–17h",
  },
];

export function centersOf(wilayaId: number) {
  const found = centers.filter((c) => c.wilayaId === wilayaId);
  if (found.length > 0) return found;
  // stub: every wilaya has at least one desk until the API says otherwise
  const w = wilayas.find((x) => x.id === wilayaId);
  if (!w) return [];
  return [
    {
      id: wilayaId * 100,
      wilayaId,
      name: { fr: `Agence ${w.name.fr}`, ar: `وكالة ${w.name.ar ?? w.name.fr}` },
      address: { fr: "Centre-ville", ar: "وسط المدينة" },
      hours: "08h–17h",
    },
  ];
}

/** centimes, per zone — PLACEHOLDER, see the header. */
const ZONE_FEES: Record<number, { home: number; desk: number }> = {
  0: { home: 40000, desk: 25000 },
  1: { home: 60000, desk: 35000 },
  2: { home: 70000, desk: 40000 },
  3: { home: 90000, desk: 50000 },
  4: { home: 120000, desk: 70000 },
};

export function zoneFees(wilayaId: number) {
  const w = wilayas.find((x) => x.id === wilayaId);
  if (!w) return null;
  return ZONE_FEES[w.zone];
}

/** Yalidine bills by the kilo above this, per PROJECT_PLAN §6. */
export const FREE_KG = 5;
export const OVERWEIGHT_RATE_DZD = 5000; // 50 DA per extra kg — placeholder

/**
 * Indicative rates for the S4 "Livraison estimée" block.
 *
 * PLACEHOLDER: hard-coded until the Yalidine credentials arrive. The block
 * says on screen that the exact price appears once the commune is chosen, so
 * this is an estimate in the copy as well as in the code — but it must be
 * replaced by a real quote before launch.
 */
export const ESTIMATED_DELIVERY_DZD = { home: 40000, desk: 25000 };
