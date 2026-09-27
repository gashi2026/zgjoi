import { pageGuard } from "@/lib/server/guard";
import { db } from "@/lib/server/db";
import Frame, { Panel } from "@/components/marketplace/Frame";
import ApiForm from "@/components/marketplace/ApiForm";
export default async function Page() {
  const actor = await pageGuard("ADMIN");
  const reviews = await db.review.findMany({
    include: {
      author: { select: { name: true } },
      profile: { select: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <Frame actor={actor} title="Moderimi i vlerësimeve">
      <Panel>
        <p>
          100 vlerësimet më të fundit. Çdo ndryshim regjistrohet me arsyen e tij
          dhe përditëson mesataren publike.
        </p>
      </Panel>
      {!reviews.length && <Panel>Nuk ka vlerësime ende.</Panel>}
      {reviews.map((r) => (
        <Panel key={r.id}>
          <h2 className="font-bold">
            {r.author.name} → {r.profile.user.name} · {r.rating}/5 · {r.state}
          </h2>
          <p className="my-3 whitespace-pre-wrap">{r.text}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <ApiForm
              endpoint="/api/admin/commands"
              values={{ id: r.id, action: "REVIEW_REMOVE" }}
              label="Hiq nga publikimi"
              fields={[
                {
                  name: "reason",
                  label: "Arsyeja e moderimit",
                  required: true,
                  minLength: 5,
                  maxLength: 1000,
                },
              ]}
            />
            {r.state !== "PUBLISHED" && (
              <ApiForm
                endpoint="/api/admin/commands"
                values={{ id: r.id, action: "REVIEW_RESTORE" }}
                label="Rikthe vlerësimin"
              />
            )}
          </div>
        </Panel>
      ))}
    </Frame>
  );
}
