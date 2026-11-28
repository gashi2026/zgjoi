import Link from "@/components/i18n/Link";
import { pageGuard } from "@/lib/server/guard";
import { db } from "@/lib/server/db";
import { activeCategories } from "@/lib/server/catalog";
import Frame, { Panel } from "@/components/marketplace/Frame";
import ApiForm, { type Field } from "@/components/marketplace/ApiForm";
import { getT } from "@/lib/i18n/server";
import { dateTime, money } from "@/lib/format";
import AdminProfessionsForm from "@/components/admin/AdminProfessionsForm";
import AdminSuspendForm from "@/components/admin/AdminSuspendForm";
import AdminDeleteForm from "@/components/admin/AdminDeleteForm";
import { suspensionIsActive } from "@/lib/suspension";
import { MAX_PRO_CATEGORIES } from "@/lib/pro-categories";
import { professionLabel, professionOptions, professionSlug, serviceCategory } from "@/lib/service-categories";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const t = await getT();
  const actor = await pageGuard("ADMIN");
  const params = await searchParams,
    q = (params.q ?? "").trim().slice(0, 100),
    page = Math.min(
      1000,
      Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1),
    );
  const [users, categories] = await Promise.all([
    db.user.findMany({
      where: {
        deletedAt: null,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
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
        suspendedUntil: true,
        suspensionReason: true,
        proProfile: {
          select: {
            id: true,
            about: true,
            verification: true,
            categorySlug: true,
            categories: { orderBy: { position: "asc" }, select: { categorySlug: true, priceFromCents: true, approvedAt: true } },
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
    { name: "name", label: t("admin.name"), required: true, maxLength: 120 },
    { name: "email", label: t("admin.email2"), type: "email", required: true },
    { name: "city", label: t("admin.city"), required: true, type: "municipality" },
    { name: "phone", label: t("admin.phone"), maxLength: 30 },
    {
      name: "role",
      label: t("admin.role"),
      type: "select",
      required: true,
      options: ["CLIENT", "PRO", "SUPPORT", "ADMIN"].map((value) => ({
        value,
        label: value,
      })),
    },
    {
      name: "password",
      label: t("admin.initialPassword"),
      type: "password",
      required: true,
      minLength: 12,
    },
  ];
  return (
    <Frame actor={actor} title={t("admin.usersProApproval")}>
      <Panel>
        <form className="flex gap-3">
          <label className="flex-1 text-sm">
            {t("admin.searchNameEmail")}<input
              name="q"
              defaultValue={q}
              maxLength={100}
              className="block w-full rounded-xl border border-line p-3 text-base"
            />
          </label>
          <button className="self-end rounded-full bg-gold p-3">{t("admin.search")}</button>
        </form>
      </Panel>
      <Panel>
        <details>
          <summary className="cursor-pointer font-bold">
            {t("admin.createAccountAdmin")}</summary>
          <div className="mt-4">
            <ApiForm
              endpoint="/api/admin/commands"
              values={{ action: "USER_CREATE", phone: "" }}
              label={t("admin.createAccount")}
              fields={[
                ...userFields,
                {
                  name: "categorySlug",
                  label: t("admin.categoryRequiredPros"),
                  type: "select",
                  options: professionOptions(categories, t.tx).filter((o) => !o.hidden).map((o) => ({
                    value: o.slug,
                    label: o.label,
                  })),
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
            {suspensionIsActive(user)
              ? user.suspendedUntil
                ? t("adminPros.suspendedUntil", { date: dateTime(user.suspendedUntil, t.locale) })
                : t("adminPros.suspendedPermanent")
              : t("admin.active")}
          </p>
          <div className="mt-4">
            <AdminSuspendForm
              userId={user.id}
              suspended={suspensionIsActive(user)}
              until={user.suspendedUntil ? user.suspendedUntil.toISOString() : null}
              reason={user.suspensionReason}
              statusLabel={
                suspensionIsActive(user)
                  ? user.suspendedUntil
                    ? t("adminPros.suspendedUntil", { date: dateTime(user.suspendedUntil, t.locale) })
                    : t("adminPros.suspendedPermanent")
                  : t("admin.active")
              }
            />
          </div>
          <details className="mt-4">
            <summary>{t("admin.editAccount")}</summary>
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
                    ? { required: false, label: t("admin.newPasswordOptional") }
                    : {}),
                }))}
                label={t("admin.saveAccount")}
              />
            </div>
          </details>
          {user.proProfile && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="font-bold">{user.proProfile.verification}</p>
              <ul className="mt-2 flex flex-wrap gap-2" data-testid="admin-pro-categories">
                {user.proProfile.categories.map((c) => (
                  <li key={c.categorySlug} className={`rounded-full border px-3 py-1 text-sm ${c.approvedAt ? "border-gold bg-honey" : "border-dashed border-gold-dark"}`}>
                    {professionLabel(c.categorySlug, t.tx)} ·{" "}
                    {c.priceFromCents ? money(c.priceFromCents, t.locale) : t("admin.noPriceYet")} ·{" "}
                    {c.approvedAt ? t("admin.professionApproved") : t("admin.professionPending")}
                  </li>
                ))}
                {!user.proProfile.categories.length && (
                  <li className="text-sm text-red-700">{t("admin.noValidProfession", { slug: user.proProfile.categorySlug })}</li>
                )}
              </ul>
              <AdminProfessionsForm
                userId={user.id}
                max={MAX_PRO_CATEGORIES}
                options={professionOptions(categories, t.tx)}
                selected={user.proProfile.categories.flatMap((c) => {
                  const slug = professionSlug(c.categorySlug);
                  return slug && categories.some((x) => x.slug === serviceCategory(slug)?.slug) ? [slug] : [];
                })}
              />
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
                    {t("admin.openDocument", { value: doc.filename ?? doc.kind })}</Link>
                  <p className="text-xs">
                    {doc.reviewed ? t("admin.reviewed") : t("admin.pending")}
                  </p>
                  {!doc.reviewed && (
                    <ApiForm
                      endpoint="/api/admin/commands"
                      values={{ action: "DOCUMENT_REVIEW", id: doc.id }}
                      label={t("admin.recordReview")}
                      fields={[
                        {
                          name: "reason",
                          label: t("admin.checkResult"),
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
                        ? user.proProfile!.verification === "APPROVED" && user.proProfile!.categories.some((c) => !c.approvedAt)
                          ? t("admin.approveNewProfessions")
                          : t("admin.approvePro")
                        : t("admin.requestChanges")
                    }
                    fields={[
                      {
                        name: "reason",
                        label: t("admin.checksReasoning"),
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
          <AdminDeleteForm userId={user.id} email={user.email} />
        </Panel>
      ))}
      <nav className="flex gap-4">
        {page > 1 && (
          <Link href={`?q=${encodeURIComponent(q)}&page=${page - 1}`}>
            {t("admin.previous")}</Link>
        )}
        {users.length === 30 && (
          <Link href={`?q=${encodeURIComponent(q)}&page=${page + 1}`}>
            {t("admin.next")}</Link>
        )}
      </nav>
    </Frame>
  );
}
