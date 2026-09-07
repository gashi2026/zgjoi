import AuthPage from "@/components/marketplace/AuthPage";
export default function Page() {
  return (
    <AuthPage
      title="Rivendosni fjalëkalimin"
      endpoint="/api/auth/forgot"
      label="Kërko lidhjen"
      text="Shkruani emailin e llogarisë. Nëse llogaria ekziston, do të regjistrojmë kërkesën tuaj për rivendosje."
      fields={[
        { name: "email", label: "Emaili", type: "email", required: true },
      ]}
    />
  );
}
