import { serviceCategory } from "@/lib/service-categories";
import { pageGuard } from "@/lib/server/guard";
import { db } from "@/lib/server/db";
import { activeCategories } from "@/lib/server/catalog";
import Frame, { Panel } from "./Frame";
import ApiForm, { type Field } from "./ApiForm";
import UploadDocument from "./UploadDocument";
import Link from "@/components/i18n/Link";
import { categoryFlow } from "@/lib/server/bookings";
import { hourOptions, hoursLabel, MINUTE_STEP } from "@/lib/book-now";
import { getT } from "@/lib/i18n/server";
export default async function ProfileEditor({ pro }: { pro: boolean }) {
  const t = await getT();
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
      label: t("profileEditor.name"),
      value: user.name,
      required: true,
      maxLength: 120,
    },
    {
      name: "city",
      label: t("profileEditor.city"),
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
        label: t("profileEditor.mainCategory"),
        type: "select",
        value: serviceCategory(profile.categorySlug)?.slug ?? "",
        required: true,
        options: categories.map((c) => ({ value: c.slug, label: t.tx(c.name) })),
      },
      {
        name: "about",
        label: t("profileEditor.experienceServices"),
        type: "textarea",
        value: profile.about,
        required: true,
        minLength: 30,
        maxLength: 4000,
      },
      {
        name: "priceFrom",
        label: t("profileEditor.startingPriceEuros"),
        type: "number",
        step: "0.01",
        min: 0.01,
        max: 100000,
        value: profile.priceFrom / 100,
        required: true,
      },
      {
        name: "experience",
        label: t("profileEditor.experience"),
        value: profile.experience ?? "",
        maxLength: 80,
      },
      {
        name: "serviceCities",
        label: t("profileEditor.citiesWork"),
        value: profile.serviceCities.join(", "),
        required: true,
        as: "list",
        hint: t("profileEditor.separateCitiesCommas"),
      },
    );
  return (
    <Frame
      actor={actor}
      title={pro ? t("profileEditor.myProfessionalProfile") : t("profileEditor.accountSettings")}
    >
      <Panel>
        <p className="mb-5 text-sm text-muted">
          {t("profileEditor.accountEmailChangeEmail", { email: user.email })}</p>
        <ApiForm
          endpoint="/api/account"
          values={{ phone: "", ...(pro ? { experience: "" } : {}) }}
          fields={fields}
          label={t("profileEditor.saveChanges")}
        />
        {pro && (
          <p className="mt-4 text-sm text-muted">
            {t("profileEditor.changingNameCategoryDescription")}</p>
        )}
      </Panel>
      {pro && profile && flow?.bookNow && (
        <Panel>
          <h2 className="mb-1 text-lg font-bold">{t("profileEditor.bookNowHourlyRate")}</h2>
          <p className="mb-4 text-sm text-muted">
            {t("profileEditor.categoryCustomersCanBook")}</p>
          <ApiForm
            endpoint="/api/account/booking-settings"
            label={t("profileEditor.saveRate")}
            fields={[
              { name: "enabled", label: t("profileEditor.acceptBookingsBookNow"), type: "checkbox", checked: Boolean(profile.hourlyRateCents) },
              { name: "hourlyRate", label: t("profileEditor.hourlyRateEuros"), type: "number", step: "0.01", min: 1, max: 1000,
                value: profile.hourlyRateCents ? profile.hourlyRateCents / 100 : "" },
              { name: "minMinutes", label: t("profileEditor.minimumHoursPerBooking"), type: "select", as: "number",
                value: String(profile.bookingMinMinutes ?? 120),
                options: hourOptions(MINUTE_STEP).map((m) => ({ value: String(m), label: t.tx(hoursLabel(m)) })) },
            ]}
          />
        </Panel>
      )}
      <Panel>
        <h2 className="mb-4 text-lg font-bold">{t("profileEditor.accountSecurity")}</h2>
        <ApiForm
          endpoint="/api/account/password"
          fields={[
            {
              name: "currentPassword",
              label: t("profileEditor.currentPassword"),
              type: "password",
              required: true,
              autoComplete: "current-password",
            },
            {
              name: "password",
              label: t("profileEditor.newPassword"),
              type: "password",
              required: true,
              minLength: 12,
              autoComplete: "new-password",
            },
          ]}
          label={t("profileEditor.changePassword")}
        />
        <p className="mt-3 text-sm text-muted">
          {t("profileEditor.youllLoggedOutAll")}</p>
      </Panel>
      {pro && profile && (
        <Panel>
          <h2 className="mb-3 text-lg font-bold">{t("profileEditor.documentsReview")}</h2>
          <p className="mb-4 text-sm text-muted">
            {t("profileEditor.documentsPrivateCanOnly")}</p>
          {process.env.DOCUMENT_UPLOADS_ENABLED === "true" ? <UploadDocument /> : <p className="text-sm text-muted">{t("profileEditor.uploadingIsntActiveYet")}</p>}
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
                {d.reviewed ? t("profileEditor.reviewed") : t("profileEditor.pending")}
              </span>
            </div>
          ))}
        </Panel>
      )}
    </Frame>
  );
}
