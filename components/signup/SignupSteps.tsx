/** Honeycomb step marker for the sign-up wizard. Pure markup: used by the client wizard and the
 * server-rendered ID step, so both look the same. */
export default function SignupSteps({ steps, current, label }: { steps: string[]; current: number; label: string }) {
  return (
    <nav aria-label={label} className="mb-6">
      <ol className="flex items-start gap-1 sm:gap-2" data-testid="signup-steps">
        {steps.map((name, i) => {
          const done = i < current, here = i === current;
          return (
            <li key={name} className="flex min-w-0 flex-1 flex-col items-center text-center" aria-current={here ? "step" : undefined}>
              <div className="flex w-full items-center">
                <span aria-hidden className={`h-[2px] flex-1 ${i === 0 ? "opacity-0" : done || here ? "bg-gold" : "bg-line"}`} />
                <span aria-hidden className={`hexframe p-[2px] ${done || here ? "bg-gold" : "bg-line"}`} style={{ width: 38, height: 44 }}>
                  <span className={`hexframe flex h-full w-full items-center justify-center text-sm font-bold ${done ? "bg-gold text-ink" : here ? "bg-[#FFF9E3] text-ink" : "bg-white text-muted"}`}>
                    {done ? "✓" : i + 1}
                  </span>
                </span>
                <span aria-hidden className={`h-[2px] flex-1 ${i === steps.length - 1 ? "opacity-0" : done ? "bg-gold" : "bg-line"}`} />
              </div>
              <span className={`mt-1 text-xs sm:text-sm ${here ? "font-bold text-ink" : "text-muted"}`}>{name}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
