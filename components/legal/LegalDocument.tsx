import { getT } from "@/lib/i18n/server";
import type { LegalDocumentSpec } from "@/lib/legal/documents";

export default async function LegalDocument({ document }: { document: LegalDocumentSpec }) {
  const t = await getT();
  return (
    <article className="bg-cream">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-line bg-white p-8 shadow-soft sm:p-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {t(document.title)}
          </h1>
          <p className="mt-3 text-sm text-muted">{t(document.effectiveDate)}</p>
          <p className="mt-6 text-base leading-relaxed text-ink">{t(document.intro)}</p>
        </header>

        <nav
          aria-label={t(document.toc)}
          className="mt-8 rounded-3xl border border-line bg-honey p-6"
        >
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink">
            {t(document.toc)}
          </h2>
          <ol className="mt-4 columns-1 gap-x-8 sm:columns-2">
            {document.sections.map((section) => (
              <li key={section.id} className="break-inside-avoid">
                <a
                  href={`#${section.id}`}
                  className="inline-block py-1 text-sm font-semibold text-gold-dark underline-offset-2 hover:underline"
                >
                  {t(section.title)}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-8">
          {document.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8"
            >
              <h2 className="text-xl font-extrabold tracking-tight text-ink">
                {t(section.title)}
              </h2>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-ink">
                {section.paragraphs.map((key) => (
                  <p key={key}>{t(key)}</p>
                ))}
              </div>
              {section.callout ? (
                <p className="mt-4 rounded-2xl bg-honey p-4 text-base leading-relaxed text-ink">
                  {t(section.callout)}
                </p>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
