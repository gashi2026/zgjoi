/* Mock data for the signed-in areas. There is no backend yet — every page
   reads from here so the screens look and behave like the real thing. */

export type Status =
  | "e-re"
  | "ne-pritje"
  | "aktive"
  | "perfunduar"
  | "anuluar";

export const statusLabel: Record<Status, string> = {
  "e-re": "E re",
  "ne-pritje": "Në pritje",
  aktive: "Në vazhdim",
  perfunduar: "Përfunduar",
  anuluar: "Anuluar",
};

export const statusStyle: Record<Status, string> = {
  "e-re": "bg-honey text-gold-dark",
  "ne-pritje": "bg-[#FFF3CF] text-[#8a6100]",
  aktive: "bg-[#E8F1FF] text-[#1B5AA8]",
  perfunduar: "bg-[#E9F7EC] text-[#1F7A3A]",
  anuluar: "bg-[#F3F1EE] text-muted",
};

/* ---------------------------- professional ---------------------------- */

export const proSummary = {
  name: "Arben Krasniqi",
  profession: "Elektricist",
  city: "Prishtinë",
  initials: "AK",
  hue: 42,
  rating: 4.9,
  reviews: 120,
  verified: true,
  memberSince: "Mars 2024",
  responseRate: 96,
  completionRate: 98,
};

export const proStats = [
  { label: "Të ardhura këtë muaj", value: "1,240€", hint: "pas komisionit" },
  { label: "Punë aktive", value: "3", hint: "në vazhdim" },
  { label: "Kërkesa të reja", value: "5", hint: "për t'u përgjigjur" },
  { label: "Vlerësimi", value: "4.9★", hint: "nga 120 vlerësime" },
];

export type Lead = {
  id: string;
  client: string;
  service: string;
  city: string;
  budget: string;
  posted: string;
  detail: string;
  status: Status;
};

export const leads: Lead[] = [
  {
    id: "k-104",
    client: "Blerta K.",
    service: "Instalim ndriçimi në banesë",
    city: "Prishtinë",
    budget: "80–120€",
    posted: "20 min më parë",
    detail:
      "Kam nevojë të montohen 6 llamba plafoni dhe të zëvendësohen dy çelësa. Materiali është blerë.",
    status: "e-re",
  },
  {
    id: "k-103",
    client: "Driton M.",
    service: "Riparim paneli elektrik",
    city: "Fushë Kosovë",
    budget: "50–90€",
    posted: "2 orë më parë",
    detail: "Siguresa kryesore bie shpesh. Duhet kontroll i plotë i panelit.",
    status: "e-re",
  },
  {
    id: "k-102",
    client: "Arta S.",
    service: "Instalim prizash — zyrë",
    city: "Prishtinë",
    budget: "150–200€",
    posted: "Dje",
    detail: "8 priza të reja në një zyrë 40m². Punë të kryhet fundjavë.",
    status: "ne-pritje",
  },
  {
    id: "k-101",
    client: "Liridon A.",
    service: "Ndërrim llambash LED",
    city: "Prishtinë",
    budget: "40–60€",
    posted: "2 ditë më parë",
    detail: "12 llamba LED për zëvendësim në një lokal.",
    status: "ne-pritje",
  },
];

export type Job = {
  id: string;
  client: string;
  service: string;
  date: string;
  amount: number;
  status: Status;
  payout: "e-bllokuar" | "e-liruar" | "—";
};

export const proJobs: Job[] = [
  { id: "p-238", client: "Blerta K.", service: "Instalim ndriçimi", date: "2 Gusht 2026", amount: 110, status: "aktive", payout: "e-bllokuar" },
  { id: "p-237", client: "Genc B.", service: "Panel dhe siguresa", date: "1 Gusht 2026", amount: 140, status: "aktive", payout: "e-bllokuar" },
  { id: "p-236", client: "Dafina R.", service: "Riparim prizash", date: "29 Korrik 2026", amount: 45, status: "aktive", payout: "e-bllokuar" },
  { id: "p-235", client: "Driton M.", service: "Instalime elektrike", date: "24 Korrik 2026", amount: 320, status: "perfunduar", payout: "e-liruar" },
  { id: "p-234", client: "Arta S.", service: "Montim ndriçimi", date: "18 Korrik 2026", amount: 95, status: "perfunduar", payout: "e-liruar" },
  { id: "p-233", client: "Liridon A.", service: "Kontroll instalimi", date: "11 Korrik 2026", amount: 60, status: "anuluar", payout: "—" },
];

export type Payout = {
  id: string;
  date: string;
  job: string;
  gross: number;
  status: "e-liruar" | "e-bllokuar";
};

export const payouts: Payout[] = [
  { id: "t-512", date: "25 Korrik 2026", job: "Instalime elektrike — Driton M.", gross: 320, status: "e-liruar" },
  { id: "t-511", date: "19 Korrik 2026", job: "Montim ndriçimi — Arta S.", gross: 95, status: "e-liruar" },
  { id: "t-510", date: "12 Korrik 2026", job: "Zëvendësim siguresash — Blendi H.", gross: 70, status: "e-liruar" },
  { id: "t-509", date: "4 Korrik 2026", job: "Instalim prizash — Vlora M.", gross: 180, status: "e-liruar" },
];

export const KOMISIONI = 15; // % — internal only, never shown on public pages

/* ------------------------------- client ------------------------------- */

export const clientSummary = {
  name: "Blerta Krasniqi",
  initials: "BK",
  hue: 200,
  city: "Prishtinë",
  memberSince: "Janar 2026",
};

export const clientStats = [
  { label: "Kërkesa aktive", value: "2", hint: "në pritje ose në vazhdim" },
  { label: "Punë të përfunduara", value: "7", hint: "gjithsej" },
  { label: "Të preferuar", value: "4", hint: "profesionistë të ruajtur" },
  { label: "Shpenzuar këtë vit", value: "860€", hint: "përmes Zgjoit" },
];

export type ClientRequest = {
  id: string;
  service: string;
  pro?: string;
  city: string;
  date: string;
  price?: number;
  status: Status;
  offers?: number;
};

export const clientRequests: ClientRequest[] = [
  { id: "kk-77", service: "Instalim ndriçimi në banesë", pro: "Arben Krasniqi", city: "Prishtinë", date: "2 Gusht 2026", price: 110, status: "aktive" },
  { id: "kk-76", service: "Pastrim i thellë — 3 dhoma", city: "Prishtinë", date: "5 Gusht 2026", status: "ne-pritje", offers: 4 },
  { id: "kk-75", service: "Lyerje e brendshme", pro: "Luan Hoxha", city: "Prishtinë", date: "12 Korrik 2026", price: 260, status: "perfunduar" },
  { id: "kk-74", service: "Zhbllokim kanalizimi", pro: "Besnik Gashi", city: "Prishtinë", date: "28 Qershor 2026", price: 45, status: "perfunduar" },
];

export type Thread = {
  id: string;
  with: string;
  role: string;
  initials: string;
  hue: number;
  last: string;
  time: string;
  unread: number;
};

export const threads: Thread[] = [
  { id: "m-1", with: "Arben Krasniqi", role: "Elektricist", initials: "AK", hue: 42, last: "Nesër në ora 10:00 jam te ju.", time: "12:04", unread: 2 },
  { id: "m-2", with: "Valon Berisha", role: "Pastrim", initials: "VB", hue: 200, last: "A e keni banesën me tri dhoma?", time: "Dje", unread: 0 },
  { id: "m-3", with: "Luan Hoxha", role: "Piktor", initials: "LH", hue: 330, last: "Faleminderit për vlerësimin!", time: "E martë", unread: 0 },
];

export const favoriteIds = [
  "arben-elektricist",
  "besnik-hidraulik",
  "valon-pastrim",
  "luan-piktor",
];

/* ------------------------------ quotes ------------------------------- */

export type Quote = {
  id: string;
  proId: string;
  pro: string;
  initials: string;
  hue: number;
  rating: number;
  reviews: number;
  verified: boolean;
  price: number;
  priceType: "fikse" | "për orë";
  availability: string;
  duration: string;
  warranty: string;
  message: string;
  includes: string[];
};

export const quotes: Quote[] = [
  {
    id: "of-1",
    proId: "valon-pastrim",
    pro: "Valon Berisha",
    initials: "VB",
    hue: 200,
    rating: 4.9,
    reviews: 143,
    verified: true,
    price: 120,
    priceType: "fikse",
    availability: "E enjte, 5 Gusht",
    duration: "4–5 orë",
    warranty: "Rikthim falas brenda 48h",
    message:
      "Përfshihen të gjitha dhomat, banjot dhe kuzhina. Vij me ekip prej dy personash dhe me pajisjet e mia.",
    includes: ["Detergjentët e përfshirë", "Ekip 2 persona", "Larje dritaresh"],
  },
  {
    id: "of-2",
    proId: "mentor-riparime",
    pro: "Mentor Zeqiri",
    initials: "MZ",
    hue: 20,
    rating: 4.8,
    reviews: 47,
    verified: true,
    price: 95,
    priceType: "fikse",
    availability: "E mërkurë, 4 Gusht",
    duration: "5–6 orë",
    warranty: "—",
    message:
      "Çmimi vlen për pastrim të thellë pa larje dritaresh. Dritaret mund t'i shtoj për 20€ shtesë.",
    includes: ["Detergjentët e përfshirë", "1 person"],
  },
  {
    id: "of-3",
    proId: "fatmir-kopsht",
    pro: "Fatmir Morina",
    initials: "FM",
    hue: 100,
    rating: 4.9,
    reviews: 51,
    verified: true,
    price: 28,
    priceType: "për orë",
    availability: "E premte, 6 Gusht",
    duration: "rreth 4 orë",
    warranty: "Kënaqësi e garantuar",
    message:
      "Punoj me orë sipas nevojës. Për 85m² zakonisht duhen 4 orë, pra rreth 112€ gjithsej.",
    includes: ["Fleksibël me orarin", "Detergjentët e klientit"],
  },
];

/* ------------------------------ chat ------------------------------- */

export type ChatMessage = {
  id: string;
  from: "une" | "tjetri";
  text: string;
  time: string;
};

export const conversation: ChatMessage[] = [
  { id: "c1", from: "une", text: "Përshëndetje! A jeni i lirë të enjten paradite për instalim ndriçimi?", time: "10:12" },
  { id: "c2", from: "tjetri", text: "Përshëndetje! Po, e enjtja në 10:00 është e lirë. Sa llamba janë gjithsej?", time: "10:20" },
  { id: "c3", from: "une", text: "Gjashtë llamba plafoni dhe dy çelësa për zëvendësim. Materialin e kam blerë.", time: "10:22" },
  { id: "c4", from: "tjetri", text: "Në rregull. Puna zgjat rreth 3 orë. Oferta ime është 110€ gjithsej, pa material.", time: "10:26" },
  { id: "c5", from: "une", text: "Dakord. E pranoj ofertën përmes platformës.", time: "10:31" },
  { id: "c6", from: "tjetri", text: "Faleminderit! Nesër në ora 10:00 jam te ju.", time: "12:04" },
];

/* --------------------------- booking / order --------------------------- */

export type Milestone = {
  label: string;
  detail: string;
  time: string;
  done: boolean;
};

export const booking = {
  id: "kk-77",
  service: "Instalim ndriçimi në banesë",
  pro: "Arben Krasniqi",
  proId: "arben-elektricist",
  initials: "AK",
  hue: 42,
  date: "E enjte, 2 Gusht 2026",
  time: "10:00 – 13:00",
  address: "Rr. Rexhep Luci 12, kati 3, Prishtinë",
  note: "Kodi i derës: 1204. Parkim në oborr.",
  price: 110,
  status: "aktive" as Status,
};

export const milestones: Milestone[] = [
  { label: "Kërkesa u dërgua", detail: "Kërkesa u publikua te profesionistët e verifikuar.", time: "28 Korrik, 09:14", done: true },
  { label: "Oferta u pranua", detail: "Pranove ofertën prej 110€ nga Arben Krasniqi.", time: "29 Korrik, 10:31", done: true },
  { label: "Pagesa u bllokua", detail: "110€ u bllokuan te Zgjoi. Nuk i merr askush deri në përfundim.", time: "29 Korrik, 10:33", done: true },
  { label: "Puna në vazhdim", detail: "Takimi është caktuar për 2 Gusht, 10:00.", time: "2 Gusht, 10:00", done: false },
  { label: "Konfirmimi dhe pagesa", detail: "Pas konfirmimit tënd, pagesa lirohet te profesionisti.", time: "—", done: false },
];

/* ------------------------------ invoice ------------------------------ */

export const invoice = {
  number: "ZGJ-2026-0771",
  items: [
    { label: "Instalim ndriçimi (6 llamba)", amount: 90 },
    { label: "Zëvendësim çelësash (2 copë)", amount: 20 },
  ],
  serviceFee: 4,
};

/* -------------------------- professional extras -------------------------- */

export type Appointment = {
  day: number; // day of month
  time: string;
  client: string;
  service: string;
  status: Status;
};

export const appointments: Appointment[] = [
  { day: 3, time: "09:00", client: "Blerta K.", service: "Instalim ndriçimi", status: "aktive" },
  { day: 3, time: "14:30", client: "Genc B.", service: "Panel dhe siguresa", status: "aktive" },
  { day: 5, time: "10:00", client: "Dafina R.", service: "Riparim prizash", status: "ne-pritje" },
  { day: 6, time: "08:30", client: "Liridon A.", service: "Kontroll instalimi", status: "aktive" },
  { day: 11, time: "11:00", client: "Arta S.", service: "Montim ndriçimi", status: "ne-pritje" },
  { day: 12, time: "16:00", client: "Driton M.", service: "Instalime elektrike", status: "aktive" },
  { day: 18, time: "09:30", client: "Vlora M.", service: "Instalim prizash", status: "ne-pritje" },
  { day: 24, time: "13:00", client: "Blendi H.", service: "Siguresa", status: "aktive" },
];

export const leadBudget = {
  weekly: 40,
  spent: 26,
  leadCost: 4,
  autoBid: true,
  radius: 25,
  categories: ["Elektricist", "Riparime"],
  cities: ["Prishtinë", "Fushë Kosovë", "Obiliq"],
};
