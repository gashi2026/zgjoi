import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Honeycomb logo mark — three interlocking outlined hexagons        */
/* ------------------------------------------------------------------ */

export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M13 4.5 L20 8.5 L20 16.5 L13 20.5 L6 16.5 L6 8.5 Z"
        stroke="#FFB800"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M27 4.5 L34 8.5 L34 16.5 L27 20.5 L20 16.5 L20 8.5 Z"
        stroke="#E89D00"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M20 17.5 L27 21.5 L27 29.5 L20 33.5 L13 29.5 L13 21.5 Z"
        stroke="#FFB800"
        strokeWidth="2.6"
        strokeLinejoin="round"
        fill="#FFF3CF"
      />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`flex items-center gap-2 font-extrabold text-xl tracking-tight text-ink ${className}`}
    >
      <LogoMark />
      Zgjoi
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Hexagon shape wrapper (CSS clip-path)                              */
/* ------------------------------------------------------------------ */

const HEX_CLIP =
  "polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0% 50%)";

export function Hex({
  children,
  className = "",
  size = 96,
}: {
  children?: React.ReactNode;
  className?: string;
  size?: number;
}) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ width: size, height: size * 1.1, clipPath: HEX_CLIP }}
    >
      {children}
    </div>
  );
}

/* Outlined hexagon rendered as SVG (crisper borders than clip-path)   */
export function HexOutline({
  size = 110,
  stroke = "#FFB800",
  strokeWidth = 2,
  fill = "#FFFFFF",
  className = "",
  children,
  shadow = false,
}: {
  size?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  className?: string;
  children?: React.ReactNode;
  shadow?: boolean;
}) {
  const h = size * 1.12;
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: h,
        filter: shadow ? "drop-shadow(0 8px 20px rgba(17,17,17,0.08))" : undefined,
      }}
    >
      <svg
        viewBox="0 0 100 112"
        width={size}
        height={h}
        className="absolute inset-0"
        aria-hidden="true"
      >
        <path
          d="M50 3 L92 28 L92 84 L50 109 L8 84 L8 28 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      </svg>
      <div className="relative z-10 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small bee illustration                                             */
/* ------------------------------------------------------------------ */

export function Bee({
  size = 44,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size * 0.82}
      viewBox="0 0 60 49"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* wings */}
      <ellipse cx="24" cy="12" rx="10" ry="8" fill="#FFF3CF" stroke="#E89D00" strokeWidth="1.6" />
      <ellipse cx="38" cy="11" rx="8" ry="6.5" fill="#FFFCF5" stroke="#E89D00" strokeWidth="1.6" />
      {/* body */}
      <ellipse cx="30" cy="30" rx="17" ry="13" fill="#FFB800" stroke="#111111" strokeWidth="2" />
      {/* stripes */}
      <path d="M24 18.5 C22.5 26 22.5 34 24 42" stroke="#111111" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M33 17.6 C31.6 26 31.6 34.4 33 42.6" stroke="#111111" strokeWidth="3.2" strokeLinecap="round" />
      {/* face */}
      <circle cx="43.5" cy="27" r="1.9" fill="#111111" />
      {/* stinger */}
      <path d="M13 30 L6.5 28.5 L12.4 34" fill="#111111" />
      {/* antennae */}
      <path d="M46 20 C48 16.5 50.5 15 53 14.6" stroke="#111111" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="53.6" cy="14.4" r="1.7" fill="#111111" />
    </svg>
  );
}

/* Dotted flight path used next to the bee */
export function FlightPath({ className = "" }: { className?: string }) {
  return (
    <svg
      width="150"
      height="60"
      viewBox="0 0 150 60"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 50 C40 55 55 15 85 20 C112 24 118 6 146 10"
        stroke="#E89D00"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1 8"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Avatar (SVG initials, warm ring) — no external images needed       */
/* ------------------------------------------------------------------ */

export function Avatar({
  initials,
  hue,
  size = 64,
  className = "",
}: {
  initials: string;
  hue: number;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold select-none ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        color: `hsl(${hue} 45% 30%)`,
        background: `linear-gradient(135deg, hsl(${hue} 80% 92%), hsl(${hue} 70% 84%))`,
        boxShadow: "inset 0 0 0 3px #FFFFFF, 0 0 0 2px #FFB800",
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Star rating                                                        */
/* ------------------------------------------------------------------ */

export function Stars({
  rating,
  size = 14,
  className = "",
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      aria-label={`${rating} nga 5 yje`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i <= Math.round(rating) ? "#FFB800" : "#ECE7DD"}
          aria-hidden="true"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}
