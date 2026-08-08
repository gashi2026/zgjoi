import HexTile from "./HexTile";
import { Avatar, Stars } from "./Brand";
import type { Professional } from "@/lib/data";

/* A professional shown as a honeycomb cell in the belt. */
export default function ProHex({
  pro,
  width,
}: {
  pro: Professional;
  width: number;
}) {
  return (
    <HexTile
      width={width}
      href={`/profesionisti/${pro.id}`}
      label={`${pro.name} — ${pro.profession}`}
    >
      <Avatar initials={pro.initials} hue={pro.hue} size={44} />
      <span className="mt-2 text-[13px] font-extrabold leading-tight text-ink">
        {pro.name}
      </span>
      <span className="text-[11px] text-muted">{pro.profession}</span>
      <span className="mt-1 flex items-center gap-1">
        <Stars rating={pro.rating} />
        <span className="text-[10.5px] text-muted">({pro.reviews})</span>
      </span>
      <span className="mt-0.5 text-[10.5px] text-muted">
        {pro.city} · nga <b className="text-ink">{pro.priceFrom}€</b>
      </span>
    </HexTile>
  );
}
