import { msgKey } from "@/lib/i18n/translate";
import { Search, Users, CheckCircle2, ThumbsUp } from "lucide-react";
import { getT } from "@/lib/i18n/server";

const steps = [
  {
    n: 1,
    icon: Search,
    title: msgKey("howItWorks.search"),
    text: msgKey("howItWorks.findServiceNeedSeconds"),
  },
  {
    n: 2,
    icon: Users,
    title: msgKey("howItWorks.chatHire"),
    text: msgKey("howItWorks.seeProfilesReviewsStart"),
  },
  {
    n: 3,
    icon: CheckCircle2,
    title: msgKey("howItWorks.acceptPay"),
    text: msgKey("howItWorks.paymentStartsOnceAccept"),
  },
  {
    n: 4,
    icon: ThumbsUp,
    title: msgKey("howItWorks.confirmReview"),
    text: msgKey("howItWorks.confirmJobFinishedThen"),
  },
];

export default async function HowItWorks({ heading = true }: { heading?: boolean }) {
  const t = await getT();
  return (
    <section className="scroll-mt-24 bg-cream" id="si-funksionon">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        {heading && (
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            {t("howItWorks.howWorks")}{" "}<span className="text-gold">{t("howItWorks.zgjoi")}</span>
          </h2>
        )}

        <ol className="relative mt-12 space-y-10">
          {/* connecting line */}
          <span
            className="absolute bottom-8 left-[26px] top-8 w-px bg-line"
            aria-hidden="true"
          />
          {steps.map(({ n, icon: Icon, title, text }) => (
            <li key={n} className="relative flex items-start gap-5 sm:gap-7">
              {/* numbered hexagon */}
              <span className="relative z-10 flex h-[52px] w-[52px] shrink-0 items-center justify-center">
                <svg
                  viewBox="0 0 100 112"
                  className="absolute inset-0 h-full w-full"
                  aria-hidden="true"
                >
                  <path
                    d="M50 4 L91 28 L91 84 L50 108 L9 84 L9 28 Z"
                    fill="#FFB800"
                  />
                </svg>
                <span className="relative z-10 text-lg font-extrabold text-white">
                  {n}
                </span>
              </span>

              <div className="flex flex-1 items-start gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft">
                <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream sm:flex">
                  <Icon
                    size={22}
                    className="text-gold-dark"
                    strokeWidth={1.9}
                  />
                </span>
                <div>
                  <h3 className="text-base font-bold text-ink">{t(title)}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {t(text)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
