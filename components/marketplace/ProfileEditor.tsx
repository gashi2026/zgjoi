import { serviceCategory } from "@/lib/service-categories";
import { pageGuard } from "@/lib/server/guard";
import { db } from "@/lib/server/db";
import { activeCategories } from "@/lib/server/catalog";
import Frame, { Panel } from "./Frame";
import ApiForm, { type Field } from "./ApiForm";
import UploadDocument from "./UploadDocument";
import Link from "next/link";
import { categoryFlow } from "@/lib/server/bookings";
import { hourOptions, hoursLabel, MINUTE_STEP } from "@/lib/book-now";
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
  const flow = pro && profile ? await categoryFlow(db, profile.categorySlug) : null;
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
        value: serviceCategory(profile.categorySlug)?.slug ?? "",
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
      {pro && profile && flow?.bookNow && (
        <Panel>
          <h2 className="mb-1 text-lg font-bold">Rezervo tani · tarifa për orë</h2>
          <p className="mb-4 text-sm text-muted">
            Në kategorinë tuaj klientët mund t’ju rezervojnë direkt me “Rezervo tani”. Ju caktoni tarifën për orë dhe
            minimumin e orëve; klienti zgjedh sa orë dëshiron (së paku minimumin) dhe totali është tarifa × orët.
            Pas punës mund të propozoni ndryshim të orëve në bisedë; vlen pasi klienti ta konfirmojë.
          </p>
          <ApiForm
            endpoint="/api/account/booking-settings"
            label="Ruaj tarifën"
            fields={[
              { name: "enabled", label: "Prano rezervime me “Rezervo tani”", type: "checkbox", checked: Boolean(profile.hourlyRateCents) },
              { name: "hourlyRate", label: "Tarifa për orë në euro", type: "number", step: "0.01", min: 1, max: 1000,
                value: profile.hourlyRateCents ? profile.hourlyRateCents / 100 : "" },
              { name: "minMinutes", label: "Minimumi i orëve për rezervim", type: "select", as: "number",
                value: String(profile.bookingMinMinutes ?? 120),
                options: hourOptions(MINUTE_STEP).map((m) => ({ value: String(m), label: hoursLabel(m) })) },
            ]}
          />
        </Panel>
      )}
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
          {process.env.DOCUMENT_UPLOADS_ENABLED === "true" ? <UploadDocument /> : <p className="text-sm text-muted">Ngarkimi ende nuk është aktiv. Mos dërgoni dokumente identiteti në bisedë ose me email.</p>}
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
