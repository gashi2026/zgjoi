import Link from "next/link";
import ApiForm, { type Field } from "./ApiForm";
export default function AuthPage({
  title,
  text,
  endpoint,
  fields,
  values,
  label,
  fragmentToken,
}: {
  title: string;
  text?: string;
  endpoint: string;
  fields?: Field[];
  values?: Record<string, unknown>;
  label: string;
  fragmentToken?: boolean;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-bold">{title}</h1>
        {text && <p className="my-4 text-muted">{text}</p>}
        <div className="mt-6">
          <ApiForm
            endpoint={endpoint}
            fields={fields}
            values={values}
            label={label}
            fragmentToken={fragmentToken}
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm text-gold-dark">
          <Link href="/hyr">Hyr</Link>
          <Link href="/regjistrohu">Llogari klienti</Link>
          <Link href="/regjistrohu-profesionist">Bëhu profesionist</Link>
          <Link href="/harrova-fjalekalimin">Harrova fjalëkalimin</Link>
        </div>
      </div>
    </div>
  );
}
