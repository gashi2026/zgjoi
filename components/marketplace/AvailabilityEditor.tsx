"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { inputClass, buttonClass } from "./ApiForm";
export default function AvailabilityEditor({
  days,
}: {
  days: { weekday: number; startMin: number; endMin: number }[];
}) {
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  const names = [
    "E hënë",
    "E martë",
    "E mërkurë",
    "E enjte",
    "E premte",
    "E shtunë",
    "E diel",
  ];
  const clock = (n: number) =>
    `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    const minutes = (value: FormDataEntryValue | null) => {
      const [h, m] = String(value).split(":").map(Number);
      return h * 60 + m;
    };
    const next = names.flatMap((_, weekday) =>
      fd.has(`day${weekday}`)
        ? [
            {
              weekday,
              startMin: minutes(fd.get(`start${weekday}`)),
              endMin: minutes(fd.get(`end${weekday}`)),
            },
          ]
        : [],
    );
    setPending(true);
    try {
      const r = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: next }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Kontrolloni oraret.");
      setMessage("Orari u ruajt.");
      router.refresh();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Nuk u ruajt; provoni përsëri.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-muted">
        Orari javor, sipas orës së Kosovës. Ky është orar orientues; rezervimet
        konfirmohen me ofertë.
      </p>
      {names.map((name, weekday) => {
        const day = days.find((d) => d.weekday === weekday);
        return (
          <div
            key={weekday}
            className="grid grid-cols-2 items-center gap-3 border-b border-line py-3 sm:grid-cols-3"
          >
            <label className="col-span-2 sm:col-span-1">
              <input
                type="checkbox"
                name={`day${weekday}`}
                defaultChecked={Boolean(day)}
                className="mr-2 h-5 w-5 accent-gold"
              />
              {name}
            </label>
            <label className="text-xs">
              Nga
              <input
                name={`start${weekday}`}
                type="time"
                defaultValue={clock(day?.startMin ?? 540)}
                className={inputClass}
                required
              />
            </label>
            <label className="text-xs">
              Deri
              <input
                name={`end${weekday}`}
                type="time"
                defaultValue={clock(day?.endMin ?? 1020)}
                className={inputClass}
                required
              />
            </label>
          </div>
        );
      })}
      <p role="status">{message}</p>
      <button disabled={pending} className={buttonClass}>
        {pending ? "Duke ruajtur…" : "Ruaj orarin"}
      </button>
    </form>
  );
}
