import BeltIcon from "./BeltIcons";

/** One renderer for service icons in the hive, lists, profiles and editor. */
export default function CategoryIcon({ name, size = 20, className = "", strokeWidth = 1.8 }: {
  name: string; size?: number; className?: string; strokeWidth?: number;
}) {
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full [&>img]:h-full [&>img]:w-full ${className}`} style={{ width: size, height: size }}>
      <BeltIcon name={name} size={size} strokeWidth={strokeWidth} />
    </span>
  );
}
