import { serviceCategories } from "./service-categories";
export type Category = {
  slug: string;
  name: string;
  icon: string;
  group: string;
};

export type Professional = {
  id: string;
  name: string;
  profession: string;
  category: string;
  rating: number;
  reviews: number;
  city: string;
  verified: boolean;
  priceFrom: number;
  available: "sot" | "neser" | "kete-jave";
  about: string;
  services: { name: string; price: number }[];
  initials: string;
  hue: number;
};

export const categories: Category[] = serviceCategories.map(({ slug, name, icon, group }) => ({ slug, name, icon, group }));

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
