import CategoryIcon from "./CategoryIcon";

/* Hand-drawn category icons, all on the same 24×24 grid with a 1.8
   outline so they sit alongside the shared icon set. */

const P = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Svg({ size, children, ratio = 1 }: { size: number; children: React.ReactNode; ratio?: number }) {
  return (
    <svg width={size} height={size * ratio} viewBox="0 0 24 24" aria-hidden="true" {...P}>
      {children}
    </svg>
  );
}

/* siren with rays */
export const Alarm = ({ size = 21 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M8 15a4 4 0 0 1 8 0" />
    <path d="M6 15h12v2.4H6z" />
    <path d="M6.6 20h10.8" />
    <path d="M12 5.4V3.2M6.9 7 5.4 5.5M17.1 7l1.5-1.5M4.6 11.6H2.6M19.4 11.6h2" />
  </Svg>
);

/* document with a stamp */
export const Notary = ({ size = 21 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M4.6 3.4h7.2L15 6.6v8.9a1 1 0 0 1-1 1H5.6a1 1 0 0 1-1-1z" />
    <path d="M11.6 3.4v3.4H15" />
    <path d="M7 9.4h5M7 12.2h4" />
    <path d="M17.4 12a1.7 1.7 0 0 1 3.4 0c0 1-.9 1.5-.9 2.4h-1.6c0-.9-.9-1.4-.9-2.4Z" />
    <path d="M17.2 15.4h3.8v1.6h-3.8zM16.4 19.6h5.4" />
  </Svg>
);

/* set square and compass */
export const Architect = ({ size = 21 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M4.4 19.4h9.2L4.4 8.6z" />
    <path d="M6.6 16.9h1.6M8.6 14.6h1.6" />
    <circle cx="17.6" cy="5.6" r="1.5" />
    <path d="M17.6 7.1v1.6" />
    <path d="M17 8.4 14.4 19.4M18.2 8.4 20.8 19.4" />
  </Svg>
);

/* fork and knife */
export const Cutlery = ({ size = 21 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M6.6 3.2v4M8.6 3.2v4M10.6 3.2v4" />
    <path d="M6.6 7.2h4v1a2 2 0 0 1-4 0z" />
    <path d="M8.6 10.2v10.6" />
    <path d="M16.4 3.2c2.4 1.6 3 5.6 2.4 8.6h-2.4z" />
    <path d="M16.4 11.8v9" />
  </Svg>
);

/* chef's hat */
export const Chef = ({ size = 21 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M7 14a3.6 3.6 0 1 1 1.5-6.9 4.2 4.2 0 0 1 7 0A3.6 3.6 0 1 1 17 14z" />
    <path d="M7 14v4.2a.8.8 0 0 0 .8.8h8.4a.8.8 0 0 0 .8-.8V14" />
    <path d="M10.3 14v5M13.7 14v5" />
  </Svg>
);

/* paw with a medical cross */
export const Vet = ({ size = 21 }: { size?: number }) => (
  <Svg size={size}>
    <ellipse cx="7.6" cy="8.4" rx="1.7" ry="2.2" />
    <ellipse cx="12" cy="6.8" rx="1.7" ry="2.2" />
    <ellipse cx="16.4" cy="8.4" rx="1.7" ry="2.2" />
    <path d="M12 11.6c-2.6 0-4.6 2-4.6 4.2 0 1.9 1.5 3.1 3.3 3.1h1.4" />
    <circle cx="16.6" cy="16.4" r="3.6" />
    <path d="M16.6 14.6v3.6M14.8 16.4h3.6" />
  </Svg>
);

/* welding mask with sparks */
export const Welding = ({ size = 21 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M7 4.4h6.6a2.4 2.4 0 0 1 2.4 2.4v6.4a4.4 4.4 0 0 1-4.4 4.4H9a4.4 4.4 0 0 1-4.4-4.4V6.8A2.4 2.4 0 0 1 7 4.4Z" />
    <path d="M7 8.6h6.4v2.8H7z" />
    <path d="M18.6 6.4 21 4.8M19.4 10.6h2.6M18.6 14.6 21 16.2" />
  </Svg>
);

/* dog's head with a heart */
export const DogHeart = ({ size = 21 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M5.6 7.4c0-2.4 1.4-3.6 2.6-3.6 1.4 0 2 1.4 2 2.8" />
    <path d="M10.2 6.6h4.4a3 3 0 0 1 3 3v.6l2 .8-2 1v1.2a2.6 2.6 0 0 1-2.6 2.6h-1.2" />
    <path d="M5.6 7.4c0 3 1.4 5.2 3.2 6.6" />
    <path d="M16 9.6h.01" />
    <path d="M13 17.6c0-1 .8-1.7 1.6-1.7.5 0 .9.2 1.1.6.2-.4.6-.6 1.1-.6.9 0 1.6.7 1.6 1.7 0 1.6-2.7 3-2.7 3s-2.7-1.4-2.7-3Z" />
  </Svg>
);

/* tow truck lifting a car */
export const TowTruck = ({ size = 21 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M2.6 14.4v-2.2l1.4-2h3.2l1.4 2v2.2" />
    <circle cx="4.6" cy="16.2" r="1.5" />
    <circle cx="8.4" cy="16.2" r="1.5" />
    <path d="M12.4 16.4v-4.8h4l2.6 2.6v2.2" />
    <circle cx="14.6" cy="17.8" r="1.5" />
    <circle cx="19.4" cy="17.8" r="1.5" />
    <path d="M13.4 11.6 11 6.6M9.6 8.2l3 5.2" />
  </Svg>
);

/* medical cross */
export const Medical = ({ size = 21 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M9.4 3.6h5.2v5.8h5.8v5.2h-5.8v5.8H9.4v-5.8H3.6V9.4h5.8Z" />
  </Svg>
);

/* nail polish and brush */
export const Nails = ({ size = 21 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M9 3.4h3.4v2.8H9z" />
    <path d="M7.8 6.2h5.8v12.6a1.6 1.6 0 0 1-1.6 1.6H9.4a1.6 1.6 0 0 1-1.6-1.6z" />
    <path d="M7.8 10.4h5.8" />
    <path d="M17.4 5.2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
    <path d="M17.4 8.4v4.2" />
    <path d="M16.2 12.6h2.4v6a1.2 1.2 0 0 1-2.4 0z" />
  </Svg>
);

/* headphones */
export const Headphones = ({ size = 21 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M4.6 15.2v-2.6a7.4 7.4 0 0 1 14.8 0v2.6" />
    <path d="M4.6 13.8h1.6a1.4 1.4 0 0 1 1.4 1.4v3a1.4 1.4 0 0 1-1.4 1.4H4.6a1.4 1.4 0 0 1-1.4-1.4v-3a1.4 1.4 0 0 1 1.4-1.4Z" />
    <path d="M17.8 13.8h1.6a1.4 1.4 0 0 1 1.4 1.4v3a1.4 1.4 0 0 1-1.4 1.4h-1.6a1.4 1.4 0 0 1-1.4-1.4v-3a1.4 1.4 0 0 1 1.4-1.4Z" />
  </Svg>
);

/* shoulder camera */
export const Camcorder = ({ size = 21 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M3.4 9.6h10.2v7.8H3.4z" />
    <path d="M13.6 12.4 19 9.8v7.4l-5.4-2.6z" />
    <path d="M5.6 7.2h4.2a1 1 0 0 1 1 1v1.4H4.6V8.2a1 1 0 0 1 1-1Z" />
    <circle cx="6.4" cy="13.4" r="1.6" />
  </Svg>
);

/* pen tool with anchor points */
export const PenTool = ({ size = 21 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M12 20.4 9.2 13.6h5.6z" />
    <path d="M12 13.6V9.8" />
    <circle cx="12" cy="8.2" r="1.5" />
    <path d="M6.2 14.2c0-3.4 2.6-6 5.8-6s5.8 2.6 5.8 6" />
    <circle cx="4.8" cy="14.6" r="1.3" />
    <circle cx="19.2" cy="14.6" r="1.3" />
    <path d="M12 8.2h4.6M12 8.2H7.4" />
    <circle cx="17.8" cy="8.2" r="1.2" />
    <circle cx="6.2" cy="8.2" r="1.2" />
  </Svg>
);

/* dancer mid-turn */
export const Dancer = ({ size = 21 }: { size?: number }) => (
  <Svg size={size}>
    <circle cx="12.6" cy="4.2" r="1.7" />
    <path d="M12.4 6.6 10.8 11l3.2 2-1 4.4" />
    <path d="M12.4 6.6 16.4 8l2.6-2.4" />
    <path d="M10.8 11 7 10.2 5 12.4" />
    <path d="M14 13 9.4 20.6" />
    <path d="M13 17.4c1.6.6 2.6 1.8 3 3.2" />
  </Svg>
);

/* pointe shoes with a ribbon */
export const Pointe = ({ size = 21 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M12 4.6c-1 -1.4-3.4-1.4-3.4.4 0 1.2 1.8 1.6 3.4 1.6" />
    <path d="M12 4.6c1-1.4 3.4-1.4 3.4.4 0 1.2-1.8 1.6-3.4 1.6" />
    <path d="M10.6 6.6 9 14.6c-.3 1.5.2 3 1.2 4 .8.8 2 .4 2.2-.7l1.4-7.6" />
    <path d="M13.4 6.6l1.6 8c.3 1.5-.2 3-1.2 4" />
    <path d="M9.2 16.6c1.4.9 3 .9 4.4 0" />
  </Svg>
);

/* hammer and plank */
export const Carpenter = ({ size = 21 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M14.6 3.6c-2 0-3.4 1.2-3.8 2.8l2 .8-.8 1.8 3.4 1.4.8-1.8 2 .8c.6-1.6.4-3.4-1-4.6" />
    <path d="M12.6 9.4 5.4 19a1.4 1.4 0 0 0 2.2 1.7l6.6-9.4" />
    <path d="M13.4 14.6 21 12.2v3.6l-7.6 2.4z" />
    <path d="M13.4 18.2 21 15.8" />
  </Svg>
);

const CUSTOM: Record<string, (p: { size?: number }) => React.ReactElement> = {
  alarm: Alarm,
  notary: Notary,
  architect: Architect,
  cutlery: Cutlery,
  chef: Chef,
  vet: Vet,
  welding: Welding,
  dogheart: DogHeart,
  towtruck: TowTruck,
  medical: Medical,
  nails: Nails,
  headphones2: Headphones,
  camcorder: Camcorder,
  pentool: PenTool,
  dancer: Dancer,
  pointe: Pointe,
  carpenter: Carpenter,
};

/* The names of every icon we draw ourselves, for the admin picker. */
export const CUSTOM_ICON_KEYS = Object.keys(CUSTOM);

/* Draw whichever icon a category asks for. The stored value can be:
   - one of our own drawings ("chef", "towtruck", …)
   - a name from the shared set ("wrench", "leaf", …)
   - a link to an image you uploaded (https://…svg | .png)
   - raw SVG code pasted straight in ("<svg …>…</svg>") */
export default function BeltIcon({ name, size = 21 }: { name: string; size?: number }) {
  const value = (name ?? "").trim();

  if (value.startsWith("<svg")) {
    return (
      <span
        className="inline-flex items-center justify-center [&>svg]:h-full [&>svg]:w-full"
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }

  if (/^https?:\/\//i.test(value)) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={value}
        alt=""
        width={size}
        height={size}
        className="object-contain"
        style={{ width: size, height: size }}
      />
    );
  }

  const Custom = CUSTOM[value];
  if (Custom) return <Custom size={size} />;
  return <CategoryIcon name={value} size={size} strokeWidth={1.8} className="text-gold-dark" />;
}
