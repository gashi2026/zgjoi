import type { NavItem } from "@/components/AccountShell";

export const proNav: NavItem[] = [
  { href: "/pro/paneli", label: "Paneli", icon: "layoutGrid" },
  { href: "/pro/kerkesat", label: "Kërkesat", icon: "inbox" },
  { href: "/pro/punet", label: "Punët", icon: "briefcase" },
  { href: "/pro/kalendari", label: "Kalendari", icon: "calendarDays" },
  { href: "/pro/mesazhet", label: "Mesazhet", icon: "messageSquare" },
  { href: "/pro/te-ardhurat", label: "Të ardhurat", icon: "wallet" },
  { href: "/pro/buxheti", label: "Buxheti i lead-eve", icon: "target" },
  { href: "/pro/profili", label: "Profili im", icon: "userRound" },
];

export const clientNav: NavItem[] = [
  { href: "/llogaria", label: "Paneli", icon: "layoutGrid" },
  { href: "/llogaria/kerkesat", label: "Kërkesat e mia", icon: "briefcase" },
  { href: "/llogaria/ofertat", label: "Ofertat", icon: "fileText" },
  { href: "/llogaria/mesazhet", label: "Mesazhet", icon: "messageSquare" },
  { href: "/llogaria/te-preferuarit", label: "Të preferuarit", icon: "heart" },
  { href: "/llogaria/cilesimet", label: "Cilësimet", icon: "settings" },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Paneli", icon: "layoutGrid" },
  { href: "/admin/perdoruesit", label: "Përdoruesit", icon: "users" },
  { href: "/admin/kategorite", label: "Kategoritë", icon: "layers" },
  { href: "/admin/transaksionet", label: "Transaksionet", icon: "receipt" },
  { href: "/admin/vleresimet", label: "Vlerësimet", icon: "shieldAlert" },
  { href: "/admin/mbeshtetja", label: "Mbështetja", icon: "headset" },
];
