"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, inputClass } from "./ApiForm";
export default function UploadDocument() {
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setPending(true);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: data,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Ngarkimi dështoi.");
      setMessage("Dokumenti u ruajt privatisht.");
      form.reset();
      router.refresh();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Ngarkimi dështoi. Provoni përsëri.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm">
        Lloji
        <select name="kind" className={inputClass}>
          <option value="ID">Dokument identifikimi</option>
          <option value="CERTIFICATE">Certifikatë</option>
          <option value="INSURANCE">Sigurim</option>
        </select>
      </label>
      <label className="block text-sm">
        Dokumenti (PDF, PNG ose JPEG, deri 3 MB)
        <input
          type="file"
          name="file"
          required
          accept="application/pdf,image/png,image/jpeg"
          className={`${inputClass} mt-1`}
        />
      </label>
      <p role="status" className="text-sm">
        {message}
      </p>
      <button disabled={pending} className={buttonClass}>
        {pending ? "Duke ngarkuar…" : "Ngarko privatisht"}
      </button>
    </form>
  );
}
