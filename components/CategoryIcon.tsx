import {
  Home, Droplets, Zap, Sparkles, Paintbrush, Leaf, Truck, Wrench,
  Hammer, Wind, Shield, Wifi, BookOpen, Globe, Music, Code,
  Calculator, Heart, Dumbbell, Apple, Camera, Palette, Headphones,
  Video, Car, Star, Scissors, Briefcase, Scale, Megaphone,
  Languages, Baby, LayoutGrid, type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  home: Home, droplets: Droplets, zap: Zap, sparkles: Sparkles,
  paintbrush: Paintbrush, leaf: Leaf, truck: Truck, wrench: Wrench,
  hammer: Hammer, wind: Wind, shield: Shield, wifi: Wifi,
  bookOpen: BookOpen, globe: Globe, music: Music, code: Code,
  calculator: Calculator, heart: Heart, dumbbell: Dumbbell,
  apple: Apple, camera: Camera, palette: Palette,
  headphones: Headphones, video: Video, car: Car, star: Star,
  scissors: Scissors, briefcase: Briefcase, scale: Scale,
  megaphone: Megaphone, languages: Languages, baby: Baby,
  grid: LayoutGrid, sparkles2: Sparkles,
  // aliases
  flower: Leaf, drama: Music, shirt: Palette,
};

export default function CategoryIcon({
  name,
  size = 20,
  className = "",
  strokeWidth = 1.8,
}: {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = icons[name] ?? Home;
  return <Icon size={size} className={className} strokeWidth={strokeWidth} />;
}
