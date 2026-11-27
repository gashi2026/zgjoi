import { idUploadsAvailable } from "@/lib/server/id-verification";
import AuthPage from "@/components/marketplace/AuthPage";
export default function Page() {
  return (
    <AuthPage
      title="Krijoni llogarinë tuaj"
      endpoint="/api/auth/register"
      label="Regjistrohu"
      values={{ role: "CLIENT" }}
      fields={[
        {
          name: "name",
          label: "Emri dhe mbiemri",
          required: true,
          maxLength: 120,
          autoComplete: "name",
        },
        {
          name: "email",
          label: "Emaili",
          type: "email",
          required: true,
          autoComplete: "email",
        },
        {
          name: "password",
          label: "Fjalëkalimi",
          type: "password",
          required: true,
          minLength: 12,
          hint: "Të paktën 12 karaktere; deri në 72 byte.",
          autoComplete: "new-password",
        },
        {
          name: "city",
          label: "Qyteti",
          required: true,
          maxLength: 60,
          autoComplete: "address-level2",
        },
        {
          name: "terms",
          label: "Pranoj kushtet dhe politikën e privatësisë",
          type: "checkbox",
          required: true,
        },
      ]}
      text={`Zgjidhni një profesionist dhe hapni një bisedë private me të. ${idUploadsAvailable() ? "Pas regjistrimit ju kërkojmë një foto të letërnjoftimit (para dhe mbrapa), që e shqyrtojmë me dorë dhe e ruajmë privatisht; pa të mund të shfletoni, por jo të rezervoni. " : ""}Lexoni kushtet te lidhja në fund të faqes.`}
    />
  );
}
