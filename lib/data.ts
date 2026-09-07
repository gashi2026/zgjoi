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

export const categories: Category[] = [
  // Shtëpia & ndërtimi
  { slug: "ndertim", name: "Ndërtim", icon: "home", group: "Shtëpia" },
  { slug: "hidraulik", name: "Hidraulik", icon: "droplets", group: "Shtëpia" },
  { slug: "elektricist", name: "Elektricist", icon: "zap", group: "Shtëpia" },
  { slug: "pastrim", name: "Pastrim", icon: "sparkles", group: "Shtëpia" },
  { slug: "piktor", name: "Piktor", icon: "paintbrush", group: "Shtëpia" },
  { slug: "kopsht", name: "Kopsht", icon: "leaf", group: "Shtëpia" },
  { slug: "transport", name: "Transport", icon: "truck", group: "Shtëpia" },
  { slug: "riparime", name: "Riparime", icon: "wrench", group: "Shtëpia" },
  {
    slug: "mobilje",
    name: "Montim mobiljesh",
    icon: "hammer",
    group: "Shtëpia",
  },
  { slug: "klima", name: "Klimatizim", icon: "wind", group: "Shtëpia" },
  {
    slug: "siguria",
    name: "Siguri & alarme",
    icon: "shield",
    group: "Shtëpia",
  },
  {
    slug: "internet",
    name: "Rrjete & internet",
    icon: "wifi",
    group: "Shtëpia",
  },
  // Arsimi & mësimi
  { slug: "tutor", name: "Kurse", icon: "bookOpen", group: "Arsimi" },
  {
    slug: "gjuhe-te-huaja",
    name: "Gjuhë të huaja",
    icon: "globe",
    group: "Arsimi",
  },
  { slug: "muzike", name: "Mësues muzike", icon: "music", group: "Arsimi" },
  { slug: "programim", name: "Programim & IT", icon: "code", group: "Arsimi" },
  {
    slug: "matematike",
    name: "Matematikë",
    icon: "calculator",
    group: "Arsimi",
  },
  // Kujdesi & fëmijët
  { slug: "nane", name: "Nënë kujdestare", icon: "baby", group: "Kujdesi" },
  {
    slug: "kujdes-pleq",
    name: "Kujdes për të moshuarit",
    icon: "heart",
    group: "Kujdesi",
  },
  {
    slug: "trajner-personal",
    name: "Trajner personal",
    icon: "dumbbell",
    group: "Kujdesi",
  },
  {
    slug: "nutricionist",
    name: "Nutricionist",
    icon: "apple",
    group: "Kujdesi",
  },
  // Arte & ngjarje
  { slug: "fotograf", name: "Fotograf", icon: "camera", group: "Arte" },
  { slug: "dekorues", name: "Dekorues", icon: "palette", group: "Arte" },
  { slug: "florist", name: "Florist", icon: "flower", group: "Arte" },
  { slug: "balet", name: "Mësues baleti", icon: "drama", group: "Arte" },
  { slug: "dj", name: "DJ & muzikë live", icon: "headphones", group: "Arte" },
  {
    slug: "kameraman",
    name: "Kameraman & video",
    icon: "video",
    group: "Arte",
  },
  // Shoferi & udhëtimi
  {
    slug: "shofer-personal",
    name: "Shofer personal",
    icon: "car",
    group: "Udhëtimi",
  },
  {
    slug: "shofer-dasme",
    name: "Shofer për dasma",
    icon: "star",
    group: "Udhëtimi",
  },
  // Bukuria & moda
  { slug: "parukeri", name: "Parukeri", icon: "scissors", group: "Bukuria" },
  {
    slug: "makeup",
    name: "Makeup artist",
    icon: "sparkles2",
    group: "Bukuria",
  },
  { slug: "stilist", name: "Stilist & mode", icon: "shirt", group: "Bukuria" },
  // Biznesi
  {
    slug: "kontabilist",
    name: "Kontabilist",
    icon: "briefcase",
    group: "Biznesi",
  },
  { slug: "avokat", name: "Avokat", icon: "scale", group: "Biznesi" },
  {
    slug: "marketing",
    name: "Marketing & media",
    icon: "megaphone",
    group: "Biznesi",
  },
  { slug: "perkthyes", name: "Përkthyes", icon: "languages", group: "Biznesi" },
  { slug: "postier", name: "Postier", icon: "mail", group: "Biznesi" },
  {
    slug: "evente",
    name: "Organizues eventesh",
    icon: "calendar",
    group: "Arte",
  },
];

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
