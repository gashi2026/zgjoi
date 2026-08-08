import CategoryIcon from "./CategoryIcon";
import { stats } from "@/lib/data";

export default function Stats() {
  return (
    <section className="border-b border-line bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-cream">
              <CategoryIcon name={s.icon} size={22} />
            </span>
            <div>
              <p className="text-2xl font-extrabold tracking-tight text-ink">
                {s.value}
              </p>
              <p className="text-sm text-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
