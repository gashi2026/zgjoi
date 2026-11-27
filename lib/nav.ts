import type { NavItem } from "@/components/AccountShell";

export const proNav: NavItem[] = [
  { href: "/pro/paneli", label: "Paneli", icon: "layoutGrid" },
  { href: "/pro/kerkesat", label: "Bisedat", icon: "messageSquare" },
  { href: "/pro/punet", label: "Punët", icon: "briefcase" },
  { href: "/pro/kalendari", label: "Kalendari", icon: "calendarDays" },
  { href: "/pro/perseritjet", label: "Abonimet", icon: "repeat" },
  { href: "/pro/pagesat", label: "Pagesat e mia", icon: "wallet" },
  { href: "/pro/te-ardhurat", label: "Të ardhurat", icon: "receipt" },
  { href: "/pro/njoftimet", label: "Njoftimet", icon: "inbox" },
  { href: "/pro/profili", label: "Profili im", icon: "userRound" },
  { href: "/siguria", label: "Siguria e llogarisë", icon: "shieldCheck" },
  { href: "/verifikimi", label: "Verifikimi i ID-së", icon: "badgeCheck" },
];

export const clientNav: NavItem[] = [
  { href: "/llogaria", label: "Paneli", icon: "layoutGrid" },
  { href: "/llogaria/kerkesat", label: "Bisedat e mia", icon: "messageSquare" },
  { href: "/llogaria/ofertat", label: "Ofertat", icon: "fileText" },
  { href: "/llogaria/perseritjet", label: "Abonimet", icon: "repeat" },
  { href: "/llogaria/te-preferuarit", label: "Të preferuarit", icon: "heart" },
  { href: "/llogaria/njoftimet", label: "Njoftimet", icon: "inbox" },
  { href: "/llogaria/cilesimet", label: "Cilësimet", icon: "settings" },
  { href: "/siguria", label: "Siguria e llogarisë", icon: "shieldCheck" },
  { href: "/verifikimi", label: "Verifikimi i ID-së", icon: "badgeCheck" },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Paneli", icon: "layoutGrid" },
  { href: "/admin/sistemi", label: "Shërbimet", icon: "settings" },
  { href: "/admin/perdoruesit", label: "Përdoruesit", icon: "users" },
  { href: "/admin/verifikimi", label: "Verifikimi i ID-ve", icon: "badgeCheck" },
  { href: "/admin/kategorite", label: "Kategoritë & Faqja", icon: "layers" },
  { href: "/admin/komisionet", label: "Komisionet", icon: "receipt" },
  { href: "/admin/pagesat", label: "Pagesat", icon: "wallet" },
  { href: "/admin/rezervimet", label: "Rezervimet", icon: "wallet" },
  { href: "/admin/kontestet", label: "Kontestet", icon: "shieldAlert" },
  { href: "/admin/transaksionet", label: "Transaksionet", icon: "receipt" },
  { href: "/admin/vleresimet", label: "Vlerësimet", icon: "shieldAlert" },
  { href: "/admin/mbeshtetja", label: "Mbështetja", icon: "headset" },
  { href: "/siguria", label: "Siguria e llogarisë", icon: "shieldCheck" },
];
