import { proUserWhere } from "@/lib/server/id-verification";
import { db } from "@/lib/server/db";
import { getT } from "@/lib/i18n/server";
export default async function Stats() {
  const t = await getT();
  const [pros, jobs, reviews] = await Promise.all([
    db.proProfile.count({
      where: {
        verification: "APPROVED",
        user: proUserWhere(),
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
        [pros, t("stats.approvedPros")],
        [jobs, t("stats.completedJobs")],
        [reviews, t("stats.reviews")],
      ].map(([value, label]) => (
        <div key={label}>
          <p className="text-2xl font-bold text-gold-dark">{value}</p>
          <p className="mt-1 text-sm text-muted">{label}</p>
        </div>
      ))}
    </section>
  );
}
