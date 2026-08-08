import {
  LayoutGrid,
  Inbox,
  Briefcase,
  Wallet,
  UserRound,
  MessageSquare,
  Heart,
  Settings,
  CalendarDays,
  FileText,
  Users,
  Receipt,
  ShieldAlert,
  Headset,
  Layers,
  Target,
} from "lucide-react";
import type { NavItem } from "@/components/AccountShell";

export const proNav: NavItem[] = [
  { href: "/pro/paneli", label: "Paneli", icon: LayoutGrid },
  { href: "/pro/kerkesat", label: "Kërkesat", icon: Inbox },
  { href: "/pro/punet", label: "Punët", icon: Briefcase },
  { href: "/pro/kalendari", label: "Kalendari", icon: CalendarDays },
  { href: "/pro/mesazhet", label: "Mesazhet", icon: MessageSquare },
  { href: "/pro/te-ardhurat", label: "Të ardhurat", icon: Wallet },
  { href: "/pro/buxheti", label: "Buxheti i lead-eve", icon: Target },
  { href: "/pro/profili", label: "Profili im", icon: UserRound },
];

export const clientNav: NavItem[] = [
  { href: "/llogaria", label: "Paneli", icon: LayoutGrid },
  { href: "/llogaria/kerkesat", label: "Kërkesat e mia", icon: Briefcase },
  { href: "/llogaria/ofertat", label: "Ofertat", icon: FileText },
  { href: "/llogaria/mesazhet", label: "Mesazhet", icon: MessageSquare },
  { href: "/llogaria/te-preferuarit", label: "Të preferuarit", icon: Heart },
  { href: "/llogaria/cilesimet", label: "Cilësimet", icon: Settings },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Paneli", icon: LayoutGrid },
  { href: "/admin/perdoruesit", label: "Përdoruesit", icon: Users },
  { href: "/admin/kategorite", label: "Kategoritë", icon: Layers },
  { href: "/admin/transaksionet", label: "Transaksionet", icon: Receipt },
  { href: "/admin/vleresimet", label: "Vlerësimet", icon: ShieldAlert },
  { href: "/admin/mbeshtetja", label: "Mbështetja", icon: Headset },
];
