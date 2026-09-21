/**
 * Conditions de vente — the canonical seed.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ SECTIONS 1-3 are transcribed from the design board.                │
 * │ SECTIONS 4-5 are DRAFTS, not legal advice. They seed with          │
 * │ needsReview: true and the admin flags them until the owner clears  │
 * │ it by hand. Returns windows and data-retention promises are        │
 * │ commitments to customers, not copy.                                │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * Titles carry no number: admin A9 reorders sections, so the position comes
 * from sortOrder.
 */
import type { Bilingual } from "./catalogue";

export type SeedAgreementSection = {
  key: string;
  title: Bilingual;
  points: Bilingual[];
  /** true when the text still needs the owner's review */
  draft?: boolean;
};

export const seedAgreement: SeedAgreementSection[] = [
  {
    key: "commande",
    title: {
      fr: "Commande et confirmation",
      ar: "الطلب والتأكيد",
    },
    points: [
      {
        fr: "Toute commande est confirmée par téléphone avant expédition.",
        ar: "يتم تأكيد كل طلب هاتفياً قبل الشحن.",
      },
      {
        fr: "Sans réponse après trois appels sur deux jours, la commande est annulée.",
        ar: "في حال عدم الرد بعد ثلاث مكالمات خلال يومين، يُلغى الطلب.",
      },
    ],
  },
  {
    key: "prix",
    title: { fr: "Prix et paiement", ar: "الأسعار والدفع" },
    points: [
      {
        fr: "Les prix sont affichés en dinars algériens, toutes taxes comprises.",
        ar: "الأسعار معروضة بالدينار الجزائري، شاملة الرسوم.",
      },
      {
        fr: "Le paiement se fait en espèces, au livreur, à la réception du colis.",
        ar: "الدفع نقداً لعامل التوصيل عند استلام الطرد.",
      },
      {
        fr: "Les frais de livraison s'ajoutent au sous-total et sont affichés avant confirmation.",
        ar: "تُضاف مصاريف التوصيل إلى المجموع وتُعرض قبل التأكيد.",
      },
    ],
  },
  {
    key: "livraison",
    title: { fr: "Livraison", ar: "التوصيل" },
    points: [
      {
        fr: "Livraison assurée par Yalidine dans les 58 wilayas, à domicile ou en point de retrait.",
        ar: "التوصيل عبر يليدين إلى 58 ولاية، إلى المنزل أو نقطة الاستلام.",
      },
      {
        fr: "Délai indicatif de 1 à 4 jours ouvrables selon la commune.",
        ar: "مدة تقديرية من 1 إلى 4 أيام عمل حسب البلدية.",
      },
    ],
  },
  {
    key: "retours",
    draft: true,
    title: {
      fr: "Retours et remboursement",
      ar: "الإرجاع والاسترجاع",
    },
    points: [
      {
        fr: "Un livre abîmé ou non conforme peut être retourné dans les 48 heures suivant la réception.",
        ar: "يمكن إرجاع أي كتاب تالف أو غير مطابق خلال 48 ساعة من الاستلام.",
      },
      {
        fr: "Contactez-nous au 0555 31 24 08 avant tout retour afin d'organiser la reprise du colis.",
        ar: "اتصل بنا على 0555 31 24 08 قبل أي إرجاع لتنظيم استرجاع الطرد.",
      },
      {
        fr: "Le remboursement porte sur le prix du livre ; les frais de livraison restent dus sauf erreur de notre part.",
        ar: "يشمل الاسترجاع ثمن الكتاب؛ وتبقى مصاريف التوصيل مستحقة إلا في حال وقوع خطأ من طرفنا.",
      },
    ],
  },
  {
    key: "donnees",
    draft: true,
    title: { fr: "Données personnelles", ar: "المعطيات الشخصية" },
    points: [
      {
        fr: "Nous conservons uniquement le nom, le téléphone et l'adresse nécessaires à la livraison.",
        ar: "نحتفظ فقط بالاسم والهاتف والعنوان اللازمة للتوصيل.",
      },
      {
        fr: "Ces informations sont transmises à Yalidine pour l'acheminement du colis, et à personne d'autre.",
        ar: "تُرسَل هذه المعلومات إلى يليدين لإيصال الطرد، وإلى لا أحد غيرهم.",
      },
      {
        fr: "Vous pouvez demander la suppression de vos données en nous appelant.",
        ar: "يمكنك طلب حذف معطياتك بالاتصال بنا.",
      },
    ],
  },
];
