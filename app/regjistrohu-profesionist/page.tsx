import type { Metadata } from "next";
import ProSignupForm from "@/components/ProSignupForm";

export const metadata: Metadata = {
  title: "Regjistrohu si profesionist — Zgjoi",
  description:
    "Krijo profilin tënd profesional në Zgjoi: falas, pa tarifë mujore, me pagesa përmes bankës.",
};

export default function ProSignupPage() {
  return <ProSignupForm />;
}
