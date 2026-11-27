import { serviceCategory } from "@/lib/service-categories";
import ProfessionsEditor from "./ProfessionsEditor";
import { MAX_PRO_CATEGORIES, professionRate } from "@/lib/pro-categories";
import { pageGuard } from "@/lib/server/guard";
import { db } from "@/lib/server/db";
import { activeCategories } from "@/lib/server/catalog";
import Frame, { Panel } from "./Frame";
import ApiForm, { type Field } from "./ApiForm";
import UploadDocument from "./UploadDocument";
import Link from "@/components/i18n/Link";
import { bookNowOn, categoryFlow } from "@/lib/server/bookings";
import { DEFAULT_MIN_MINUTES, hourOptions, hoursLabel, MINUTE_STEP } from "@/lib/book-now";
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
          categories: { orderBy: { position: "asc" } },
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
  // Book now applies when any of the pro's professions offers it (one hourly rate for all of them).
  const flows = pro && profile ? await Promise.all(profile.categories.map((c) => categoryFlow(db, c.categorySlug))) : [];
  const bookNowOffered = flows.some((f) => f.bookNow);
  // Professions (canonical slugs) that offer Book now: their minimum hours limit the booking length.
  const bookNowCategories = pro ? await Promise.all(categories.map(async (c) => ((await categoryFlow(db, c.slug)).bookNow ? c.slug : null))) : [];
  const bookNowSlugs: string[] = bookNowCategories.flatMap((s) => (s ? [s] : []));
  const defaultMin = String(profile?.bookingMinMinutes ?? DEFAULT_MIN_MINUTES);
  // Book now needs at least one Book now profession with an hourly rate (its own, else the legacy single rate).
  const bookNowRated = Boolean(profile?.categories.some((c, i) => flows[i]?.bookNow && professionRate(c, profile.hourlyRateCents)));
  const euros = (cents: number | null) => (cents ? (cents % 100 ? (cents / 100).toFixed(2) : String(cents / 100)) : "");
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
      type: "municipality",
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
        name: "about",
        label: t("profileEditor.experienceServices"),
        type: "textarea",
        value: profile.about,
        required: true,
        minLength: 30,
        maxLength: 4000,
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
        type: "municipalities",
        hint: t("municipality.serviceCitiesHint"),
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
            {t("profileEditor.changingNameDescription")}</p>
        )}
      </Panel>
      {pro && profile && (
        <section id="profesionet" className="min-w-0 scroll-mt-24 break-words rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-6">
          <h2 className="mb-1 text-lg font-bold">{t("profileEditor.professionsPrices")}</h2>
          <p className="mb-4 text-sm text-muted">{t("profileEditor.professionsPricesIntro")}</p>
          <ProfessionsEditor max={MAX_PRO_CATEGORIES} profileApproved={profile.verification === "APPROVED"}
            options={categories.map((c) => ({ slug: c.slug, label: t.tx(c.name), icon: c.icon }))}
            initial={profile.categories.flatMap((c) => {
              const slug = serviceCategory(c.categorySlug)?.slug;
              return slug && categories.some((x) => x.slug === slug) ? [{ slug, priceFrom: euros(c.priceFromCents),
                minMinutes: c.minMinutes ? String(c.minMinutes) : bookNowSlugs.includes(slug) ? defaultMin : "",
                // Rates live per profession; a pro who had the old single rate sees it pre-filled on their Book now professions.
                hourlyRate: euros(c.hourlyRateCents ?? (bookNowSlugs.includes(slug) ? profile.hourlyRateCents : null)),
                approved: Boolean(c.approvedAt) }] : [];
            })}
            bookNowSlugs={bookNowSlugs} defaultMin={defaultMin}
            hours={hourOptions(MINUTE_STEP).map((m) => ({ value: String(m), label: t.tx(hoursLabel(m)) }))} />
        </section>
      )}
      {pro && profile && bookNowOffered && (
        <Panel>
          <h2 className="mb-1 text-lg font-bold">{t("profileEditor.bookNowTitle")}</h2>
          <p className="mb-4 text-sm text-muted">
            {t("profileEditor.categoryCustomersCanBook")}</p>
          {!bookNowRated && <p className="mb-4 rounded-xl bg-[#FFF9E3] p-3 text-sm" role="status">{t("profileEditor.bookNowNeedsRateProfession")}</p>}
          <div data-testid="book-now-form">
            <ApiForm
              endpoint="/api/account/booking-settings"
              label={t("profileEditor.saveBookNow")}
              fields={[
                { name: "enabled", label: t("profileEditor.acceptBookingsBookNow"), type: "checkbox", checked: bookNowOn(profile) && bookNowRated },
              ]}
            />
          </div>
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
