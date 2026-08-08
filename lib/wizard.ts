/* Dynamic questionnaire: each category asks its own follow-up questions. */

export type Question =
  | { id: string; label: string; type: "single"; options: string[] }
  | { id: string; label: string; type: "multi"; options: string[] }
  | { id: string; label: string; type: "number"; unit?: string; placeholder?: string }
  | { id: string; label: string; type: "text"; placeholder?: string };

export const questionsByCategory: Record<string, Question[]> = {
  piktor: [
    { id: "rooms", label: "Sa dhoma duhen lyer?", type: "number", unit: "dhoma", placeholder: "p.sh. 3" },
    { id: "surface", label: "Çfarë duhet lyer?", type: "multi", options: ["Muret", "Tavani", "Dyert dhe dritaret", "Fasada"] },
    { id: "condition", label: "Në çfarë gjendjeje janë muret?", type: "single", options: ["Të reja, pa lyer", "Të lyera më parë", "Me dëmtime, duhen riparuar"] },
    { id: "paint", label: "Kush e siguron ngjyrën?", type: "single", options: ["Unë e siguroj", "Profesionisti ta sjellë"] },
  ],
  elektricist: [
    { id: "work", label: "Çfarë pune ju nevojitet?", type: "multi", options: ["Instalim i ri", "Riparim defekti", "Montim ndriçimi", "Panel dhe siguresa"] },
    { id: "points", label: "Sa pika elektrike përfshihen?", type: "number", unit: "pika", placeholder: "p.sh. 8" },
    { id: "urgency", label: "Sa urgjente është?", type: "single", options: ["Sot", "Këtë javë", "Javën e ardhshme", "Nuk ka nxitim"] },
  ],
  hidraulik: [
    { id: "issue", label: "Për çfarë bëhet fjalë?", type: "single", options: ["Rrjedhje uji", "Kanalizim i bllokuar", "Montim bojleri", "Instalim banjoje"] },
    { id: "where", label: "Ku ndodhet problemi?", type: "multi", options: ["Banjë", "Kuzhinë", "Bodrum", "Jashtë"] },
    { id: "urgency", label: "Sa urgjente është?", type: "single", options: ["Urgjente — sot", "Këtë javë", "Fleksibël"] },
  ],
  pastrim: [
    { id: "type", label: "Çfarë lloj pastrimi?", type: "single", options: ["I përgjithshëm", "I thellë", "Pas ndërtimit", "Larje dritaresh"] },
    { id: "size", label: "Sa është sipërfaqja?", type: "number", unit: "m²", placeholder: "p.sh. 85" },
    { id: "freq", label: "Sa shpesh?", type: "single", options: ["Një herë", "Javore", "Dy herë në muaj", "Mujore"] },
  ],
  ndertim: [
    { id: "scope", label: "Çfarë përfshin projekti?", type: "multi", options: ["Renovim i plotë", "Shtrim pllakash", "Mure dhe suvatim", "Izolim"] },
    { id: "size", label: "Sa është sipërfaqja?", type: "number", unit: "m²", placeholder: "p.sh. 60" },
    { id: "start", label: "Kur dëshironi të nisë?", type: "single", options: ["Sa më shpejt", "Brenda muajit", "Në 2–3 muaj"] },
  ],
};

/* Fallback for categories without a custom set */
export const defaultQuestions: Question[] = [
  { id: "scope", label: "Përshkruani shkurt punën", type: "text", placeholder: "Çfarë duhet bërë?" },
  { id: "urgency", label: "Kur ju nevojitet?", type: "single", options: ["Sot", "Këtë javë", "Këtë muaj", "Fleksibël"] },
];

export function questionsFor(slug: string): Question[] {
  return questionsByCategory[slug] ?? defaultQuestions;
}

export const budgets = ["Nën 100€", "100–300€", "300–800€", "800–2000€", "Mbi 2000€", "Nuk e di ende"];
