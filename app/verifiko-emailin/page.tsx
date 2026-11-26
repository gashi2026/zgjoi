import AuthPage from "@/components/marketplace/AuthPage";
export default function Page() {
  return (
    <AuthPage
      title="Verifikoni emailin"
      endpoint="/api/auth/verify"
      label="Konfirmo emailin"
      fragmentToken
      text="Shtypni butonin për të konfirmuar adresën e emailit."
    />
  );
}
