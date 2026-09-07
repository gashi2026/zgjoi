import AuthPage from "@/components/marketplace/AuthPage";
export default function Page() {
  return (
    <AuthPage
      title="Fjalëkalimi i ri"
      endpoint="/api/auth/reset"
      label="Ruaj fjalëkalimin"
      fragmentToken
      fields={[
        {
          name: "password",
          label: "Fjalëkalimi i ri",
          type: "password",
          required: true,
          minLength: 12,
          autoComplete: "new-password",
        },
      ]}
    />
  );
}
