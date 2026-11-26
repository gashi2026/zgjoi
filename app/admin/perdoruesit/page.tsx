import Link from "next/link";
import { pageGuard } from "@/lib/server/guard";
import { db } from "@/lib/server/db";
import { activeCategories } from "@/lib/server/catalog";
import Frame, { Panel } from "@/components/marketplace/Frame";
import ApiForm, { type Field } from "@/components/marketplace/ApiForm";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const actor = await pageGuard("ADMIN");
  const params = await searchParams,
    q = (params.q ?? "").trim().slice(0, 100),
    page = Math.min(
      1000,
      Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1),
    );
  const [users, categories] = await Promise.all([
    db.user.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      orderBy: { createdAt: "desc" },
      take: 30,
      skip: (page - 1) * 30,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        city: true,
        phone: true,
        suspendedAt: true,
        proProfile: {
          select: {
            id: true,
            about: true,
            verification: true,
            categorySlug: true,
            documents: {
              select: { id: true, filename: true, kind: true, reviewed: true },
            },
          },
        },
      },
    }),
    activeCategories(),
  ]);
  const userFields: Field[] = [
    { name: "name", label: "Emri", required: true, maxLength: 120 },
    { name: "email", label: "Emaili", type: "email", required: true },
    { name: "city", label: "Qyteti", required: true, maxLength: 60 },
    { name: "phone", label: "Telefoni", maxLength: 30 },
    {
      name: "role",
      label: "Roli",
      type: "select",
      required: true,
      options: ["CLIENT", "PRO", "SUPPORT", "ADMIN"].map((value) => ({
        value,
        label: value,
      })),
    },
    {
      name: "password",
      label: "Fjalëkalimi fillestar",
      type: "password",
      required: true,
      minLength: 12,
    },
  ];
  return (
    <Frame actor={actor} title="Përdoruesit dhe miratimi i profesionistëve">
      <Panel>
        <form className="flex gap-3">
          <label className="flex-1 text-sm">
            Kërko emër ose email
            <input
              name="q"
              defaultValue={q}
              maxLength={100}
              className="block w-full rounded-xl border border-line p-3 text-base"
            />
          </label>
          <button className="self-end rounded-full bg-gold p-3">Kërko</button>
        </form>
      </Panel>
      <Panel>
        <details>
          <summary className="cursor-pointer font-bold">
            Krijo llogari nga administrata
          </summary>
          <div className="mt-4">
            <ApiForm
              endpoint="/api/admin/commands"
              values={{ action: "USER_CREATE", phone: "" }}
              label="Krijo llogarinë"
              fields={[
                ...userFields,
                {
                  name: "categorySlug",
                  label: "Kategoria (kërkohet për profesionistin)",
                  type: "select",
                  options: categories.map((c) => ({
                    value: c.slug,
                    label: c.name,
                  })),
                },
                {
                  name: "priceFrom",
                  label: "Çmimi fillestar në euro (profesionisti)",
                  type: "number",
                  min: 0.01,
                  max: 100000,
                  step: "0.01",
                },
              ]}
            />
          </div>
        </details>
      </Panel>
      {users.map((user) => (
        <Panel key={user.id}>
          <h2 className="text-lg font-bold">{user.name}</h2>
          <p className="text-sm text-muted">
            {user.email} · {user.role} ·{" "}
            {user.suspendedAt ? "Pezulluar" : "Aktiv"}
          </p>
          <div className="mt-4 flex gap-3">
            <ApiForm
              endpoint="/api/admin/commands"
              values={{
                id: user.id,
                action: user.suspendedAt ? "USER_RESTORE" : "USER_SUSPEND",
              }}
              label={user.suspendedAt ? "Riaktivizo" : "Pezullo llogarinë"}
              confirmation="Ndryshoni qasjen e kësaj llogarie? Historiku ruhet."
            />
          </div>
          <details className="mt-4">
            <summary>Ndrysho llogarinë</summary>
            <div className="mt-3">
              <ApiForm
                endpoint="/api/admin/commands"
                values={{ action: "USER_UPDATE", id: user.id, phone: "" }}
                fields={userFields.map((f) => ({
                  ...f,
                  value:
                    f.name === "password"
                      ? ""
                      : String(
                          user[
                            f.name as
                              | "name"
                              | "email"
                              | "city"
                              | "phone"
                              | "role"
                          ] ?? "",
                        ),
                  ...(f.name === "password"
                    ? { required: false, label: "Fjalëkalimi i ri (opsional)" }
                    : {}),
                }))}
                label="Ruaj llogarinë"
              />
            </div>
          </details>
          {user.proProfile && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="font-bold">
                {user.proProfile.categorySlug} · {user.proProfile.verification}
              </p>
              <p className="my-3 whitespace-pre-wrap text-sm">
                {user.proProfile.about}
              </p>
              {user.proProfile.documents.map((doc) => (
                <div key={doc.id} className="my-3 rounded-xl bg-cream p-3">
                  <Link
                    href={`/api/documents/${doc.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gold-dark"
                  >
                    Hap dokumentin: {doc.filename ?? doc.kind}
                  </Link>
                  <p className="text-xs">
                    {doc.reviewed ? "Shqyrtuar" : "Në pritje"}
                  </p>
                  {!doc.reviewed && (
                    <ApiForm
                      endpoint="/api/admin/commands"
                      values={{ action: "DOCUMENT_REVIEW", id: doc.id }}
                      label="Regjistro shqyrtimin"
                      fields={[
                        {
                          name: "reason",
                          label: "Rezultati i kontrollit",
                          required: true,
                          minLength: 5,
                          maxLength: 1000,
                        },
                      ]}
                    />
                  )}
                </div>
              ))}
              <div className="grid gap-5 sm:grid-cols-2">
                {["PRO_APPROVE", "PRO_REJECT"].map((action) => (
                  <ApiForm
                    key={action}
                    endpoint="/api/admin/commands"
                    values={{ id: user.proProfile!.id, action }}
                    label={
                      action === "PRO_APPROVE"
                        ? "Mirato profesionistin"
                        : "Kërko rishikim"
                    }
                    fields={[
                      {
                        name: "reason",
                        label: "Kontrollet dhe arsyeja",
                        type: "textarea",
                        required: true,
                        minLength: 5,
                        maxLength: 1000,
                      },
                    ]}
                  />
                ))}
              </div>
            </div>
          )}
        </Panel>
      ))}
      <nav className="flex gap-4">
        {page > 1 && (
          <Link href={`?q=${encodeURIComponent(q)}&page=${page - 1}`}>
            ← Më parë
          </Link>
        )}
        {users.length === 30 && (
          <Link href={`?q=${encodeURIComponent(q)}&page=${page + 1}`}>
            Tjetër →
          </Link>
        )}
      </nav>
    </Frame>
  );
}
