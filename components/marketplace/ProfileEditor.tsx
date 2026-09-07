import { pageGuard } from "@/lib/server/guard";
import { db } from "@/lib/server/db";
import { activeCategories } from "@/lib/server/catalog";
import Frame, { Panel } from "./Frame";
import ApiForm, { type Field } from "./ApiForm";
import UploadDocument from "./UploadDocument";
import Link from "next/link";
export default async function ProfileEditor({ pro }: { pro: boolean }) {
  const actor = await pageGuard(pro ? "PRO" : "CLIENT");
  const user = await db.user.findUniqueOrThrow({
    where: { id: actor.id },
    select: {
      name: true,
      city: true,
      phone: true,
      email: true,
      proProfile: {
        include: {
          documents: {
            select: { id: true, kind: true, filename: true, reviewed: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });
  const categories = pro ? await activeCategories() : [];
  const profile = user.proProfile;
  const fields: Field[] = [
    {
      name: "name",
      label: "Emri",
      value: user.name,
      required: true,
      maxLength: 120,
    },
    {
      name: "city",
      label: "Qyteti",
      value: user.city ?? "",
      required: true,
      maxLength: 60,
    },
    {
      name: "phone",
      label: "Telefoni (privat)",
      value: user.phone ?? "",
      maxLength: 30,
    },
  ];
  if (pro && profile)
    fields.push(
      {
        name: "categorySlug",
        label: "Kategoria kryesore",
        type: "select",
        value: profile.categorySlug,
        required: true,
        options: categories.map((c) => ({ value: c.slug, label: c.name })),
      },
      {
        name: "about",
        label: "Përvoja dhe shërbimet",
        type: "textarea",
        value: profile.about,
        required: true,
        minLength: 30,
        maxLength: 4000,
      },
      {
        name: "priceFrom",
        label: "Çmimi fillestar në euro",
        type: "number",
        step: "0.01",
        min: 0.01,
        max: 100000,
        value: profile.priceFrom / 100,
        required: true,
      },
      {
        name: "experience",
        label: "Përvoja",
        value: profile.experience ?? "",
        maxLength: 80,
      },
      {
        name: "serviceCities",
        label: "Qytetet ku punoni",
        value: profile.serviceCities.join(", "),
        required: true,
        as: "list",
        hint: "Ndani qytetet me presje.",
      },
    );
  return (
    <Frame
      actor={actor}
      title={pro ? "Profili im profesional" : "Cilësimet e llogarisë"}
    >
      <Panel>
        <p className="mb-5 text-sm text-muted">
          Emaili i llogarisë: {user.email}. Për ndryshimin e emailit kontaktoni
          mbështetjen.
        </p>
        <ApiForm
          endpoint="/api/account"
          values={{ phone: "", ...(pro ? { experience: "" } : {}) }}
          fields={fields}
          label="Ruaj ndryshimet"
        />
        {pro && (
          <p className="mt-4 text-sm text-muted">
            Ndryshimi i emrit, kategorisë ose përshkrimit e kthen profilin për
            shqyrtim.
          </p>
        )}
      </Panel>
      <Panel>
        <h2 className="mb-4 text-lg font-bold">Siguria e llogarisë</h2>
        <ApiForm
          endpoint="/api/account/password"
          fields={[
            {
              name: "currentPassword",
              label: "Fjalëkalimi aktual",
              type: "password",
              required: true,
              autoComplete: "current-password",
            },
            {
              name: "password",
              label: "Fjalëkalimi i ri",
              type: "password",
              required: true,
              minLength: 12,
              autoComplete: "new-password",
            },
          ]}
          label="Ndrysho fjalëkalimin"
        />
        <p className="mt-3 text-sm text-muted">
          Do të dilni nga të gjitha pajisjet pas ndryshimit.
        </p>
      </Panel>
      {pro && profile && (
        <Panel>
          <h2 className="mb-3 text-lg font-bold">Dokumentet për shqyrtim</h2>
          <p className="mb-4 text-sm text-muted">
            Dokumentet janë private dhe mund t’i hapni vetëm ju dhe
            administrata.
          </p>
          <UploadDocument />
          {profile.documents.map((d) => (
            <div className="mt-4 flex flex-wrap gap-3" key={d.id}>
              <Link
                href={`/api/documents/${d.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-gold-dark"
              >
                {d.filename ?? d.kind}
              </Link>
              <span className="text-sm">
                {d.reviewed ? "Shqyrtuar" : "Në pritje"}
              </span>
            </div>
          ))}
        </Panel>
      )}
    </Frame>
  );
}
