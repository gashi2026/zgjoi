import AuthPage from "@/components/marketplace/AuthPage";
export default function Page() {
  return (
    <AuthPage
      title="Mirë se u kthyet"
      endpoint="/api/auth/login"
      label="Hyr"
      fields={[
        {
          name: "email",
          label: "Emaili",
          type: "email",
          required: true,
          autoComplete: "username",
        },
        {
          name: "password",
          label: "Fjalëkalimi",
          type: "password",
          required: true,
          autoComplete: "current-password",
        },
        {
          name: "secondFactor",
          label: "Kodi i autentikimit ose rikuperimit (nëse e keni aktivizuar)",
          autoComplete: "one-time-code",
        },
      ]}
    />
  );
}
