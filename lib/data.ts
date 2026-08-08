export type Category = {
  slug: string;
  name: string;
  icon: string;
  count: number;
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

export type Review = {
  proId: string;
  author: string;
  city: string;
  rating: number;
  text: string;
  date: string;
};

export type Testimonial = {
  quote: string;
  name: string;
  city: string;
};

export const categories: Category[] = [
  // Shtëpia & ndërtimi
  { slug: "ndertim", name: "Ndërtim", icon: "home", count: 640, group: "Shtëpia" },
  { slug: "hidraulik", name: "Hidraulik", icon: "droplets", count: 520, group: "Shtëpia" },
  { slug: "elektricist", name: "Elektricist", icon: "zap", count: 480, group: "Shtëpia" },
  { slug: "pastrim", name: "Pastrim", icon: "sparkles", count: 730, group: "Shtëpia" },
  { slug: "piktor", name: "Piktor", icon: "paintbrush", count: 310, group: "Shtëpia" },
  { slug: "kopsht", name: "Kopsht", icon: "leaf", count: 260, group: "Shtëpia" },
  { slug: "transport", name: "Transport", icon: "truck", count: 340, group: "Shtëpia" },
  { slug: "riparime", name: "Riparime", icon: "wrench", count: 410, group: "Shtëpia" },
  { slug: "mobilje", name: "Montim mobiljesh", icon: "hammer", count: 220, group: "Shtëpia" },
  { slug: "klima", name: "Klimatizim", icon: "wind", count: 180, group: "Shtëpia" },
  { slug: "siguria", name: "Siguri & alarme", icon: "shield", count: 120, group: "Shtëpia" },
  { slug: "internet", name: "Rrjete & internet", icon: "wifi", count: 140, group: "Shtëpia" },
  // Arsimi & mësimi
  { slug: "tutor", name: "Kurse", icon: "bookOpen", count: 380, group: "Arsimi" },
  { slug: "gjuhe-te-huaja", name: "Gjuhë të huaja", icon: "globe", count: 290, group: "Arsimi" },
  { slug: "muzike", name: "Mësues muzike", icon: "music", count: 160, group: "Arsimi" },
  { slug: "programim", name: "Programim & IT", icon: "code", count: 210, group: "Arsimi" },
  { slug: "matematike", name: "Matematikë", icon: "calculator", count: 340, group: "Arsimi" },
  // Kujdesi & fëmijët
  { slug: "nane", name: "Nënë kujdestare", icon: "baby", count: 175, group: "Kujdesi" },
  { slug: "kujdes-pleq", name: "Kujdes për të moshuarit", icon: "heart", count: 130, group: "Kujdesi" },
  { slug: "trajner-personal", name: "Trajner personal", icon: "dumbbell", count: 195, group: "Kujdesi" },
  { slug: "nutricionist", name: "Nutricionist", icon: "apple", count: 88, group: "Kujdesi" },
  // Arte & ngjarje
  { slug: "fotograf", name: "Fotograf", icon: "camera", count: 420, group: "Arte" },
  { slug: "dekorues", name: "Dekorues", icon: "palette", count: 230, group: "Arte" },
  { slug: "florist", name: "Florist", icon: "flower", count: 145, group: "Arte" },
  { slug: "balet", name: "Mësues baleti", icon: "drama", count: 62, group: "Arte" },
  { slug: "dj", name: "DJ & muzikë live", icon: "headphones", count: 110, group: "Arte" },
  { slug: "kameraman", name: "Kameraman & video", icon: "video", count: 180, group: "Arte" },
  // Shoferi & udhëtimi
  { slug: "shofer-personal", name: "Shofer personal", icon: "car", count: 95, group: "Udhëtimi" },
  { slug: "shofer-dasme", name: "Shofer për dasma", icon: "star", count: 78, group: "Udhëtimi" },
  // Bukuria & moda
  { slug: "parukeri", name: "Parukeri", icon: "scissors", count: 560, group: "Bukuria" },
  { slug: "makeup", name: "Makeup artist", icon: "sparkles2", count: 310, group: "Bukuria" },
  { slug: "stilist", name: "Stilist & mode", icon: "shirt", count: 140, group: "Bukuria" },
  // Biznesi
  { slug: "kontabilist", name: "Kontabilist", icon: "briefcase", count: 265, group: "Biznesi" },
  { slug: "avokat", name: "Avokat", icon: "scale", count: 190, group: "Biznesi" },
  { slug: "marketing", name: "Marketing & media", icon: "megaphone", count: 225, group: "Biznesi" },
  { slug: "perkthyes", name: "Përkthyes", icon: "languages", count: 170, group: "Biznesi" },
  { slug: "postier", name: "Postier", icon: "mail", count: 85, group: "Biznesi" },
  { slug: "evente", name: "Organizues eventesh", icon: "calendar", count: 120, group: "Arte" },
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

export const professionals: Professional[] = [
  {
    id: "arben-elektricist",
    name: "Arben Krasniqi",
    profession: "Elektricist",
    category: "elektricist",
    rating: 4.9,
    reviews: 120,
    city: "Prishtinë",
    verified: true,
    priceFrom: 15,
    available: "sot",
    about: "Elektricist me 10 vjet përvojë në instalime shtëpiake dhe industriale.",
    services: [
      { name: "Instalim ndriçimi", price: 15 },
      { name: "Riparim paneli", price: 25 },
      { name: "Montim prizash", price: 10 },
    ],
    initials: "AK",
    hue: 42,
  },
  {
    id: "besnik-hidraulik",
    name: "Besnik Gashi",
    profession: "Hidraulik",
    category: "hidraulik",
    rating: 4.8,
    reviews: 96,
    city: "Prishtinë",
    verified: true,
    priceFrom: 20,
    available: "neser",
    about: "Hidraulik i certifikuar me përvojë në instalime dhe riparime.",
    services: [
      { name: "Zhbllokim kanalizimi", price: 20 },
      { name: "Montim bojleri", price: 80 },
      { name: "Riparim rrjedhje", price: 25 },
    ],
    initials: "BG",
    hue: 12,
  },
  {
    id: "valon-pastrim",
    name: "Valon Berisha",
    profession: "Pastrim",
    category: "pastrim",
    rating: 4.9,
    reviews: 143,
    city: "Prizren",
    verified: true,
    priceFrom: 12,
    available: "sot",
    about: "Shërbim pastrimi profesional për shtëpi dhe zyra.",
    services: [
      { name: "Pastrim i thellë", price: 12 },
      { name: "Pastrim pas ndërtimit", price: 18 },
      { name: "Larje dritaresh", price: 8 },
    ],
    initials: "VB",
    hue: 200,
  },
  {
    id: "luan-piktor",
    name: "Luan Hoxha",
    profession: "Piktor",
    category: "piktor",
    rating: 4.7,
    reviews: 78,
    city: "Pejë",
    verified: true,
    priceFrom: 18,
    available: "kete-jave",
    about: "Piktor me 8 vjet përvojë në lyerje të brendshme dhe të jashtme.",
    services: [
      { name: "Lyerje dhomash", price: 18 },
      { name: "Lyerje fasade", price: 22 },
      { name: "Suvatim", price: 15 },
    ],
    initials: "LH",
    hue: 330,
  },
  {
    id: "sara-tutor",
    name: "Sara Morina",
    profession: "Tutore",
    category: "tutor",
    rating: 5.0,
    reviews: 64,
    city: "Prishtinë",
    verified: true,
    priceFrom: 10,
    available: "sot",
    about: "Tutore me diplomë në matematikë dhe fizikë. Përgatitje për maturë shtetërore.",
    services: [
      { name: "Matematikë", price: 10 },
      { name: "Fizikë", price: 10 },
      { name: "Kimia", price: 10 },
    ],
    initials: "SM",
    hue: 160,
  },
  {
    id: "ana-balet",
    name: "Ana Pjetri",
    profession: "Mësuese baleti",
    category: "balet",
    rating: 4.9,
    reviews: 41,
    city: "Prishtinë",
    verified: true,
    priceFrom: 15,
    available: "neser",
    about: "Mësuese baleti me 12 vjet përvojë. Klasa për fëmijë dhe të rritur.",
    services: [
      { name: "Balet për fëmijë", price: 15 },
      { name: "Balet për të rritur", price: 18 },
      { name: "Koreografi", price: 25 },
    ],
    initials: "AP",
    hue: 300,
  },
  {
    id: "driton-ndertim",
    name: "Driton Shala",
    profession: "Ndërtimtar",
    category: "ndertim",
    rating: 4.8,
    reviews: 64,
    city: "Ferizaj",
    verified: true,
    priceFrom: 50,
    available: "kete-jave",
    about: "Ndërtimtar me 15 vjet përvojë në renovime dhe ndërtime të reja.",
    services: [
      { name: "Renovim i plotë", price: 50 },
      { name: "Shtrim pllakash", price: 20 },
      { name: "Izolim", price: 15 },
    ],
    initials: "DS",
    hue: 160,
  },
  {
    id: "elma-fotograf",
    name: "Elma Berisha",
    profession: "Fotografe",
    category: "fotograf",
    rating: 4.9,
    reviews: 89,
    city: "Prishtinë",
    verified: true,
    priceFrom: 50,
    available: "kete-jave",
    about: "Fotografe profesionale për dasma, portrete dhe evente.",
    services: [
      { name: "Fotografi dasme", price: 500 },
      { name: "Portrete", price: 50 },
      { name: "Fotografi produktesh", price: 80 },
    ],
    initials: "EB",
    hue: 25,
  },
];

export const testimonials: Testimonial[] = [
  { quote: "E gjeta elektricistin brenda 10 minutash. Perfekt!", name: "Blendi", city: "Prishtinë" },
  { quote: "Hidrauliku më i mirë — shërbim i shkëlqyer.", name: "Arta", city: "Fushë Kosovë" },
  { quote: "Paguan vetëm pas punës — siguri e plotë.", name: "Dardan", city: "Prizren" },
  { quote: "Kërkova të shtunën, të dielën puna ishte kryer.", name: "Vlora", city: "Gjakovë" },
  { quote: "Tutorja e Sarës ndryshoi notat e djalit tim.", name: "Mimoza", city: "Prishtinë" },
  { quote: "Fotografja e dasmës tonë ishte e mrekullueshme!", name: "Burim", city: "Pejë" },
];

export const stats = [
  { value: "10K+", label: "Klientë të kënaqur", icon: "users" },
  { value: "5K+", label: "Profesionistë aktivë", icon: "briefcase" },
  { value: "50K+", label: "Punë të përfunduara", icon: "check" },
  { value: "4.9★", label: "Vlerësimi mesatar", icon: "star" },
];

export const popularSearches = [
  "Elektricist", "Hidraulik", "Pastrim", "Tutor", "Fotograf", "Shofer",
  "Nënë kujdestare", "Dekorues", "Florist", "Mësues gjuhe",
];

export function getProfessional(id: string) {
  return professionals.find((p) => p.id === id);
}

export function getReviews(proId: string): Review[] {
  return reviews.filter((r) => r.proId === proId);
}

const reviews: Review[] = [
  { proId: "arben-elektricist", author: "Blerta K.", city: "Prishtinë", rating: 5, text: "Punoi me shpejtësi dhe profesionalizëm.", date: "Korrik 2026" },
  { proId: "arben-elektricist", author: "Genc M.", city: "Prishtinë", rating: 5, text: "Çmim i drejtë, punë e pastër.", date: "Qershor 2026" },
  { proId: "besnik-hidraulik", author: "Arta S.", city: "Prishtinë", rating: 5, text: "Zgjidhi problemin brenda një ore.", date: "Korrik 2026" },
  { proId: "valon-pastrim", author: "Dafina R.", city: "Prizren", rating: 5, text: "Shtëpia shkëlqen pas pastrimit.", date: "Gusht 2026" },
  { proId: "sara-tutor", author: "Mimoza B.", city: "Prishtinë", rating: 5, text: "Djali im kaloi maturën me 9. Faleminderit Sara!", date: "Qershor 2026" },
];
