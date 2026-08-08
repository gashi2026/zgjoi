/* Mock data for the admin control panel. */

export const adminStats = [
  { label: "Vëllimi i transaksioneve", value: "184,320€", hint: "12 muajt e fundit" },
  { label: "Komisioni i platformës", value: "27,648€", hint: "15% mesatarisht" },
  { label: "Përdorues aktivë", value: "12,480", hint: "+8.4% këtë muaj" },
  { label: "Verifikime në pritje", value: "23", hint: "kërkojnë shqyrtim" },
];

export const growth = [
  { month: "Shk", users: 6200, volume: 9800 },
  { month: "Mar", users: 7100, volume: 11400 },
  { month: "Pri", users: 8300, volume: 13100 },
  { month: "Maj", users: 9600, volume: 15600 },
  { month: "Qer", users: 10800, volume: 17200 },
  { month: "Kor", users: 12480, volume: 19400 },
];

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "Klient" | "Profesionist";
  city: string;
  joined: string;
  jobs: number;
  verification: "i-verifikuar" | "ne-pritje" | "refuzuar" | "—";
  state: "aktiv" | "pezulluar";
};

export const adminUsers: AdminUser[] = [
  { id: "u-1041", name: "Arben Krasniqi", email: "arben@example.com", role: "Profesionist", city: "Prishtinë", joined: "Mars 2024", jobs: 138, verification: "i-verifikuar", state: "aktiv" },
  { id: "u-1042", name: "Blerta Krasniqi", email: "blerta@example.com", role: "Klient", city: "Prishtinë", joined: "Janar 2026", jobs: 9, verification: "—", state: "aktiv" },
  { id: "u-1043", name: "Mentor Zeqiri", email: "mentor@example.com", role: "Profesionist", city: "Gjilan", joined: "Qershor 2026", jobs: 4, verification: "ne-pritje", state: "aktiv" },
  { id: "u-1044", name: "Dritan Sh.", email: "dritan@example.com", role: "Profesionist", city: "Ferizaj", joined: "Korrik 2026", jobs: 0, verification: "ne-pritje", state: "aktiv" },
  { id: "u-1045", name: "Egzon B.", email: "egzon@example.com", role: "Profesionist", city: "Prizren", joined: "Maj 2026", jobs: 2, verification: "refuzuar", state: "pezulluar" },
  { id: "u-1046", name: "Vlora Morina", email: "vlora@example.com", role: "Klient", city: "Gjakovë", joined: "Prill 2026", jobs: 3, verification: "—", state: "aktiv" },
];

export type Txn = {
  id: string;
  date: string;
  job: string;
  client: string;
  pro: string;
  gross: number;
  type: "pagesë" | "lirim" | "rimbursim" | "kontest";
  state: "e-bllokuar" | "e-liruar" | "e-rimbursuar" | "në-kontest";
};

export const transactions: Txn[] = [
  { id: "t-901", date: "31 Korrik 2026", job: "Instalim ndriçimi", client: "Blerta K.", pro: "Arben Krasniqi", gross: 110, type: "pagesë", state: "e-bllokuar" },
  { id: "t-900", date: "30 Korrik 2026", job: "Pastrim i thellë", client: "Dafina R.", pro: "Valon Berisha", gross: 120, type: "lirim", state: "e-liruar" },
  { id: "t-899", date: "29 Korrik 2026", job: "Lyerje e brendshme", client: "Genc B.", pro: "Luan Hoxha", gross: 260, type: "lirim", state: "e-liruar" },
  { id: "t-898", date: "27 Korrik 2026", job: "Montim mobiljesh", client: "Arta S.", pro: "Mentor Zeqiri", gross: 85, type: "kontest", state: "në-kontest" },
  { id: "t-897", date: "24 Korrik 2026", job: "Zhbllokim kanalizimi", client: "Liridon A.", pro: "Besnik Gashi", gross: 45, type: "rimbursim", state: "e-rimbursuar" },
];

export type FlaggedReview = {
  id: string;
  author: string;
  pro: string;
  rating: number;
  text: string;
  reason: string;
  date: string;
};

export const flaggedReviews: FlaggedReview[] = [
  {
    id: "r-311",
    author: "Anonim",
    pro: "Mentor Zeqiri",
    rating: 1,
    text: "Puna nuk u krye fare dhe nuk përgjigjet në telefon.",
    reason: "Raportuar nga profesionisti: klienti nuk ka pasur punë të konfirmuar",
    date: "30 Korrik 2026",
  },
  {
    id: "r-310",
    author: "Egzon B.",
    pro: "Valon Berisha",
    rating: 5,
    text: "Më i miri në qytet, telefononi në 044 000 000 për zbritje!",
    reason: "Dyshim për vlerësim promocional / numër kontakti",
    date: "28 Korrik 2026",
  },
  {
    id: "r-309",
    author: "Arta S.",
    pro: "Luan Hoxha",
    rating: 2,
    text: "Çmimi ndryshoi pas përfundimit të punës.",
    reason: "Raportuar për kontest çmimi — lidhet me transaksionin t-898",
    date: "27 Korrik 2026",
  },
];

export const pendingVerifications = [
  { name: "Mentor Zeqiri", category: "Riparime", city: "Gjilan", docs: "ID + certifikatë", waiting: "2 ditë" },
  { name: "Dritan Sh.", category: "Ndërtim", city: "Ferizaj", docs: "ID", waiting: "1 ditë" },
  { name: "Albina H.", category: "Pastrim", city: "Prishtinë", docs: "ID + referenca", waiting: "6 orë" },
];
