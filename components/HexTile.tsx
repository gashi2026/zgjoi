import Link from "next/link";

/**
 * A pointy-top hexagon tile for the honeycomb belts.
 * Pointy-top cells have vertical left and right edges, so a row of them
 * sits in a straight line and packs edge to edge with no gaps.
 */
export default function HexTile({
  width,
  href,
  children,
  label,
}: {
  width: number;
  href?: string;
  children: React.ReactNode;
  label?: string;
}) {
  const height = width * 1.1547;

  const inner = (
    <div className="hexframe h-full w-full bg-gold p-[2px] transition-colors duration-200 group-hover:bg-gold-dark">
      <div className="hexframe flex h-full w-full items-center justify-center bg-[#FFF9E3] transition-colors duration-200 group-hover:bg-honey">
        <div
          className="flex flex-col items-center text-center"
          style={{ width: width * 0.66 }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  const style = { width, height };

  if (href) {
    return (
      <Link
        href={href}
        aria-label={label}
        draggable={false}
        className="group relative block shrink-0 select-none hover:z-20"
        style={style}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="group relative block shrink-0 select-none" style={style}>
      {inner}
    </div>
  );
}
