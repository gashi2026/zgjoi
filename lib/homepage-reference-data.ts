import { serviceCategories } from "./service-categories";
/** zgjoi.com presentation data for the Preview homepage (design from
 * production commit 4e6c58a). Invented stats, testimonials and sample
 * professionals were removed in the beta QA fixes (Nov 2026).
 * Presentation-only: not live marketplace totals, accounts, reviews, or offers.
 * Only the Preview reference homepage imports this module; never API/data queries.
 */
export type Category = {
  slug: string;
  name: string;
  icon: string;
  group: string;
};

export type BetaPromise = {
  title: string;
  text: string;
  icon: string;
};

export const categories = serviceCategories.map(({ slug, name, icon, group }) => ({ slug, name, icon, group }));

export const cities = [
  "Prishtinë",
  "Prizren",
  "Pejë",
  "Gjakovë",
  "Gjilan",
  "Ferizaj",
  "Mitrovicë",
  "Vushtrri",
  "Podujevë",
  "Suharekë",
  "Drenas",
  "Rahovec",
  "Malishevë",
  "Klinë",
  "Skenderaj",
  "Istog",
  "Deçan",
  "Junik",
  "Kaçanik",
  "Shtimje",
];

/* Honest beta facts. No invented totals, ratings, reviews or customers:
   live numbers appear only once they exist in the marketplace. */
export const stats = [
  { value: String(serviceCategories.length), label: "Kategori shërbimesh", icon: "grid" },
  { value: "Privat", label: "Kërkesa shkon vetëm te profesionisti që zgjidhni", icon: "mail" },
  { value: "Shqyrtim", label: "Profilet miratohen para se të shfaqen", icon: "shield" },
  { value: "Beta", label: "Po hapemi gradualisht në Kosovë", icon: "calendar" },
];

/* What the beta actually guarantees — replaces the invented testimonials. */
export const betaPromises: BetaPromise[] = [
  { title: "Ofertë e qartë", text: "Çmimi dhe orari vijnë si ofertë zyrtare që e shihni para se ta pranoni.", icon: "briefcase" },
  { title: "Kërkesë private", text: "Kërkesa juaj shkon vetëm te profesionisti që zgjidhni, jo te të gjithë.", icon: "mail" },
  { title: "Profile të shqyrtuara", text: "Ekipi i Zgjoi shqyrton profilet para se të publikohen.", icon: "shield" },
  { title: "Bisedë në Zgjoi", text: "Bisedoni brenda platformës derisa rezervimi të konfirmohet.", icon: "headphones" },
  { title: "Vlerësime të vërteta", text: "Vlerësimet shkruhen vetëm pas një pune të konfirmuar nga klienti.", icon: "star" },
  { title: "Jemi në beta", text: "Po fillojmë me pak profesionistë dhe po mësojmë nga çdo kërkesë.", icon: "sparkles" },
];
