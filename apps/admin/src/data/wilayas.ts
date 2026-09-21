/**
 * The 58 wilayas, id and name only.
 *
 * DUPLICATED ON PURPOSE, TEMPORARILY: copied from apps/store/src/lib/geo.ts
 * so A10 can offer a real origin wilaya. The admin needs no communes, no
 * centres and no zone fees, so only the names are carried across. Phase 1
 * replaces both with the Yalidine GET /wilayas response cached in Mongo.
 */
import type { Bilingual } from "@/lib/types";

export type Wilaya = { id: number; name: Bilingual };

export const wilayas: Wilaya[] = [
  { id: 1, name: { fr: "Adrar", ar: "أدرار" } },
  { id: 2, name: { fr: "Chlef", ar: "الشلف" } },
  { id: 3, name: { fr: "Laghouat", ar: "الأغواط" } },
  { id: 4, name: { fr: "Oum El Bouaghi", ar: "أم البواقي" } },
  { id: 5, name: { fr: "Batna", ar: "باتنة" } },
  { id: 6, name: { fr: "Béjaïa", ar: "بجاية" } },
  { id: 7, name: { fr: "Biskra", ar: "بسكرة" } },
  { id: 8, name: { fr: "Béchar", ar: "بشار" } },
  { id: 9, name: { fr: "Blida", ar: "البليدة" } },
  { id: 10, name: { fr: "Bouira", ar: "البويرة" } },
  { id: 11, name: { fr: "Tamanrasset", ar: "تمنراست" } },
  { id: 12, name: { fr: "Tébessa", ar: "تبسة" } },
  { id: 13, name: { fr: "Tlemcen", ar: "تلمسان" } },
  { id: 14, name: { fr: "Tiaret", ar: "تيارت" } },
  { id: 15, name: { fr: "Tizi Ouzou", ar: "تيزي وزو" } },
  { id: 16, name: { fr: "Alger", ar: "الجزائر" } },
  { id: 17, name: { fr: "Djelfa", ar: "الجلفة" } },
  { id: 18, name: { fr: "Jijel", ar: "جيجل" } },
  { id: 19, name: { fr: "Sétif", ar: "سطيف" } },
  { id: 20, name: { fr: "Saïda", ar: "سعيدة" } },
  { id: 21, name: { fr: "Skikda", ar: "سكيكدة" } },
  { id: 22, name: { fr: "Sidi Bel Abbès", ar: "سيدي بلعباس" } },
  { id: 23, name: { fr: "Annaba", ar: "عنابة" } },
  { id: 24, name: { fr: "Guelma", ar: "قالمة" } },
  { id: 25, name: { fr: "Constantine", ar: "قسنطينة" } },
  { id: 26, name: { fr: "Médéa", ar: "المدية" } },
  { id: 27, name: { fr: "Mostaganem", ar: "مستغانم" } },
  { id: 28, name: { fr: "M'Sila", ar: "المسيلة" } },
  { id: 29, name: { fr: "Mascara", ar: "معسكر" } },
  { id: 30, name: { fr: "Ouargla", ar: "ورقلة" } },
  { id: 31, name: { fr: "Oran", ar: "وهران" } },
  { id: 32, name: { fr: "El Bayadh", ar: "البيض" } },
  { id: 33, name: { fr: "Illizi", ar: "إليزي" } },
  { id: 34, name: { fr: "Bordj Bou Arréridj", ar: "برج بوعريريج" } },
  { id: 35, name: { fr: "Boumerdès", ar: "بومرداس" } },
  { id: 36, name: { fr: "El Tarf", ar: "الطارف" } },
  { id: 37, name: { fr: "Tindouf", ar: "تندوف" } },
  { id: 38, name: { fr: "Tissemsilt", ar: "تيسمسيلت" } },
  { id: 39, name: { fr: "El Oued", ar: "الوادي" } },
  { id: 40, name: { fr: "Khenchela", ar: "خنشلة" } },
  { id: 41, name: { fr: "Souk Ahras", ar: "سوق أهراس" } },
  { id: 42, name: { fr: "Tipaza", ar: "تيبازة" } },
  { id: 43, name: { fr: "Mila", ar: "ميلة" } },
  { id: 44, name: { fr: "Aïn Defla", ar: "عين الدفلى" } },
  { id: 45, name: { fr: "Naâma", ar: "النعامة" } },
  { id: 46, name: { fr: "Aïn Témouchent", ar: "عين تموشنت" } },
  { id: 47, name: { fr: "Ghardaïa", ar: "غرداية" } },
  { id: 48, name: { fr: "Relizane", ar: "غليزان" } },
  { id: 49, name: { fr: "Timimoun", ar: "تيميمون" } },
  { id: 50, name: { fr: "Bordj Badji Mokhtar", ar: "برج باجي مختار" } },
  { id: 51, name: { fr: "Ouled Djellal", ar: "أولاد جلال" } },
  { id: 52, name: { fr: "Béni Abbès", ar: "بني عباس" } },
  { id: 53, name: { fr: "In Salah", ar: "عين صالح" } },
  { id: 54, name: { fr: "In Guezzam", ar: "عين قزام" } },
  { id: 55, name: { fr: "Touggourt", ar: "تقرت" } },
  { id: 56, name: { fr: "Djanet", ar: "جانت" } },
  { id: 57, name: { fr: "El M'Ghair", ar: "المغير" } },
  { id: 58, name: { fr: "El Meniaa", ar: "المنيعة" } },
];
