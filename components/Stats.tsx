import { db } from "@/lib/server/db";
export default async function Stats() {
  const [pros, jobs, reviews] = await Promise.all([
    db.proProfile.count({
      where: {
        verification: "APPROVED",
        user: { role: "PRO", suspendedAt: null },
      },
    }),
    db.serviceRequest.count({
      where: { state: "COMPLETED", completedAt: { not: null } },
    }),
    db.review.count({ where: { state: "PUBLISHED" } }),
  ]);
  return (
    <section className="mx-auto grid max-w-5xl grid-cols-3 gap-4 px-4 py-10 text-center">
      {[
        [pros, "Profesionistë të miratuar"],
        [jobs, "Punë të përfunduara"],
        [reviews, "Vlerësime"],
      ].map(([value, label]) => (
        <div key={label}>
          <p className="text-2xl font-bold text-gold-dark">{value}</p>
          <p className="mt-1 text-sm text-muted">{label}</p>
        </div>
      ))}
    </section>
  );
}
