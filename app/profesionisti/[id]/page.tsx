import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfessional, getReviews, professionals } from "@/lib/data";
import ProProfile from "@/components/ProProfile";

export function generateStaticParams() {
  return professionals.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const pro = getProfessional((await params).id);
  if (!pro) return { title: "Profesionisti — Zgjoi" };
  return {
    title: `${pro.name} — ${pro.profession} në ${pro.city} | Zgjoi`,
    description: pro.about,
  };
}

export default async function ProfesionistiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const pro = getProfessional((await params).id);
  if (!pro) return notFound();

  return <ProProfile pro={pro} reviews={getReviews(pro.id)} />;
}
