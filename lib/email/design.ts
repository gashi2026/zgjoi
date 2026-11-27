/**
 * Zgjoi automated email design (approved v3, Plus Jakarta Sans).
 * One shared layout for every automated email: only the icon, headline,
 * copy and button change. Tables + inline CSS so it works in Gmail,
 * Apple Mail and Outlook; Arial/Helvetica fallback when web fonts are blocked.
 * All copy is Albanian. Pure functions: no secrets, no I/O.
 */

const FONT = "'Plus Jakarta Sans',Arial,Helvetica,sans-serif";
export const EMAIL_SUPPORT = "info@zgjoi.com";
export const EMAIL_SITE = "https://zgjoi.com";

export type EmailContent = {
  /** Browser-tab title and the subject line, without the "| Zgjoi" suffix. */
  subject: string;
  /** Hidden preview text shown in the inbox list. */
  preheader: string;
  icon: string;
  title: string;
  subtitle: string;
  /** Main paragraphs. */
  body: string[];
  cta?: { label: string; url: string };
  /** Small grey note under the button (e.g. "if you didn't ask for this..."). */
  note?: string;
};

export const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Plain text links only; email addresses in copy become mailto links. */
const richText = (value: string) =>
  escapeHtml(value).replace(/info@zgjoi\.com/g, `<a href="mailto:${EMAIL_SUPPORT}" style="font-family:${FONT};color:#6B500B;text-decoration:underline;">${EMAIL_SUPPORT}</a>`);

const safeUrl = (url: string) => {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && parsed.hostname === "localhost"))
    throw new Error("EMAIL_LINK_NOT_HTTPS");
  return escapeHtml(url);
};

export const emailSubject = (content: Pick<EmailContent, "subject">) => `${content.subject} | Zgjoi`;

export function renderEmailHtml(content: EmailContent, year = new Date().getFullYear()): string {
  const td = `font-family:${FONT};`;
  const cta = content.cta ? (() => {
    const href = safeUrl(content.cta.url);
    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 20px;"><tr><td bgcolor="#F5C542" align="center" style="${td}border-radius:10px;mso-padding-alt:16px 18px;"><a href="${href}" style="${td}display:block;padding:16px 18px;border:1px solid #F5C542;border-radius:10px;font-size:16px;line-height:22px;font-weight:600;color:#171717;text-decoration:none;">${escapeHtml(content.cta.label)}</a></td></tr></table>
<p style="${td}font-size:12px;line-height:18px;margin:0 0 14px;color:#666666;">Nëse butoni nuk funksionon, <a href="${href}" style="${td}color:#6B500B;text-decoration:underline;">kliko këtu</a>.</p>`;
  })() : "";
  const body = content.body
    .map((p) => `<p style="${td}margin:0 0 14px;color:#333333;font-size:16px;line-height:26px;">${richText(p)}</p>`)
    .join("\n");
  const note = content.note
    ? `<p style="${td}margin:16px 0 0;color:#666666;font-size:13px;line-height:21px;">${richText(content.note)}</p>`
    : "";
  return `<!doctype html>
<html lang="sq"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escapeHtml(emailSubject(content))}</title><!--[if !mso]><!--><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&amp;display=swap"><style type="text/css">body,table,td,p,a,h1,div {font-family: ${FONT};} @media only screen and (max-width:480px){.zg-pad{padding-left:20px!important;padding-right:20px!important}.zg-h1{font-size:24px!important;line-height:31px!important}}</style><!--<![endif]--></head>
<body style="margin:0;padding:0;background:#F7F7F7;${td}color:#171717;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(content.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F7F7F7"><tr><td align="center" style="${td}padding:24px 12px;">
<!--[if mso]><table role="presentation" width="560"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="max-width:560px;background:#FFFFFF;border:1px solid #EEEEEE;border-radius:16px;">
<tr><td style="${td}padding:30px 26px 0;" align="center"><div style="${td}font-size:36px;font-weight:800;line-height:44px;letter-spacing:-1.5px;color:#171717;">Zgjoi</div></td></tr>
<tr><td style="${td}padding:24px 26px 0;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td bgcolor="#E9B936" height="3" style="${td}height:3px;line-height:3px;font-size:1px;border-radius:3px;">&nbsp;</td></tr></table></td></tr>
<tr><td align="center" class="zg-pad" style="${td}padding:28px 36px 30px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 22px;"><tr><td width="64" height="64" align="center" valign="middle" bgcolor="#FFF7E1" style="width:64px;height:64px;border-radius:50%;font-size:31px;line-height:64px;color:#B78B18;${td}"><span aria-hidden="true">${escapeHtml(content.icon)}</span></td></tr></table>
<h1 class="zg-h1" style="${td}margin:0 0 15px;color:#171717;font-size:28px;line-height:35px;letter-spacing:-.6px;font-weight:700;">${escapeHtml(content.title)}</h1>
<p style="${td}margin:0 0 24px;color:#666666;font-size:15px;line-height:23px;">${escapeHtml(content.subtitle)}</p>
${body}
${cta}
${note}
</td></tr>
<tr><td style="${td}padding:0 26px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td bgcolor="#EEEEEE" height="1" style="${td}height:1px;line-height:1px;font-size:1px;">&nbsp;</td></tr></table></td></tr>
<tr><td align="center" style="${td}padding:24px 26px 30px;font-size:12px;line-height:20px;color:#666666;">
<p style="${td}margin:0 0 10px;font-weight:bold;font-size:14px;color:#171717;">Zgjoi — Gjithçka fillon këtu.</p>
<p style="${td}margin:0 0 10px;"><a href="${EMAIL_SITE}" style="${td}color:#666666;text-decoration:underline;">www.zgjoi.com</a> &nbsp;·&nbsp; <a href="mailto:${EMAIL_SUPPORT}" style="${td}color:#666666;text-decoration:underline;">${EMAIL_SUPPORT}</a></p>
<p style="${td}margin:0 0 10px;">Ky email është dërguar automatikisht. Ju lutemi, mos iu përgjigjni këtij emaili.</p>
<p style="${td}margin:0;">© ${year} Zgjoi</p>
</td></tr></table><!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
}

/** Plain-text alternative sent alongside the HTML (accessibility, text-only clients). */
export function renderEmailText(content: EmailContent): string {
  return [
    content.title, content.subtitle, "", ...content.body,
    ...(content.cta ? ["", `${content.cta.label}: ${content.cta.url}`] : []),
    ...(content.note ? ["", content.note] : []),
    "", "—", "Zgjoi — Gjithçka fillon këtu.", `www.zgjoi.com · ${EMAIL_SUPPORT}`,
    "Ky email është dërguar automatikisht. Ju lutemi, mos iu përgjigjni këtij emaili.",
  ].join("\n");
}

export function renderEmail(content: EmailContent) {
  return { subject: emailSubject(content), html: renderEmailHtml(content), text: renderEmailText(content) };
}

// ---- Templates -----------------------------------------------------------

export const confirmSignupEmail = (url: string): EmailContent => ({
  subject: "Konfirmo emailin tënd", preheader: "Një botë shërbimesh, vetëm një klik larg.", icon: "✉",
  title: "Mirë se erdhe në Zgjoi!", subtitle: "Një botë shërbimesh, vetëm një klik larg.",
  body: ["Konfirmo adresën tënde të emailit për të aktivizuar llogarinë dhe për të filluar me Zgjoi."],
  cta: { label: "Konfirmo emailin", url },
  note: "Nëse nuk e ke krijuar këtë llogari, mund ta shpërfillësh këtë email.",
});

export const resetPasswordEmail = (url: string): EmailContent => ({
  subject: "Rivendos fjalëkalimin", preheader: "Rikthe qasjen në llogarinë tënde.", icon: "↻",
  title: "Ke harruar fjalëkalimin?", subtitle: "Rikthe qasjen në llogarinë tënde.",
  body: ["Kemi pranuar një kërkesë për rivendosjen e fjalëkalimit tënd. Kliko butonin më poshtë për të vendosur një fjalëkalim të ri."],
  cta: { label: "Rivendos fjalëkalimin", url },
  note: "Nëse nuk e ke kërkuar këtë ndryshim, mund ta shpërfillësh këtë email. Mos e ndaj këtë lidhje me askënd.",
});

/** Ready for a future passwordless login; Zgjoi has no magic-link flow today. */
export const magicLinkEmail = (url: string): EmailContent => ({
  subject: "Hyr në llogarinë tënde", preheader: "Qasje e sigurt në llogarinë tënde.", icon: "→",
  title: "Hyr në Zgjoi", subtitle: "Qasje e sigurt në llogarinë tënde.",
  body: ["Kliko butonin më poshtë për të hyrë në llogarinë tënde në Zgjoi."],
  cta: { label: "Hyr në llogari", url },
  note: "Nëse nuk e ke kërkuar këtë lidhje, mund ta shpërfillësh këtë email. Mos e ndaj me askënd.",
});

/** Ready for a future self-service email change; today only admins change emails. */
export const changeEmailEmail = (url: string): EmailContent => ({
  subject: "Konfirmo ndryshimin e emailit", preheader: "Mbaji të përditësuara të dhënat e llogarisë.", icon: "✉",
  title: "Ndrysho adresën e emailit", subtitle: "Mbaji të përditësuara të dhënat e llogarisë.",
  body: ["Kemi pranuar një kërkesë për ndryshimin e adresës së emailit të llogarisë tënde. Konfirmo kërkesën për të vazhduar."],
  cta: { label: "Konfirmo ndryshimin", url },
  note: "Nëse nuk e ke kërkuar këtë ndryshim, mos kliko lidhjen dhe na kontakto.",
});

export const passwordChangedEmail = (): EmailContent => ({
  subject: "Fjalëkalimi yt është ndryshuar", preheader: "Siguria e llogarisë tënde ka rëndësi.", icon: "✓",
  title: "Fjalëkalimi yt është ndryshuar", subtitle: "Siguria e llogarisë tënde ka rëndësi.",
  body: ["Fjalëkalimi i llogarisë tënde në Zgjoi është ndryshuar me sukses."],
  note: "Nëse nuk e ke bërë ti këtë ndryshim, na kontakto menjëherë në info@zgjoi.com.",
});

export const welcomeEmail = (url: string): EmailContent => ({
  subject: "Llogaria jote është gati", preheader: "Një botë shërbimesh, vetëm një klik larg.", icon: "✓",
  title: "Llogaria jote është gati!", subtitle: "Një botë shërbimesh, vetëm një klik larg.",
  body: ["Tani je pjesë e Zgjoi. Zbulo shërbimet dhe gjej profesionistët që të duhen."],
  cta: { label: "Eksploro Zgjoi", url },
  note: "Ke nevojë për ndihmë? Na shkruaj në info@zgjoi.com.",
});

/**
 * Reusable account notice (KYC result, offers, bookings, payments, job completion).
 * Content stays generic: an event title and an authenticated account link, never
 * chat text, documents, addresses or private capability URLs.
 */
export const accountNoticeEmail = (n: { title: string; url: string; icon?: string; body?: string; cta?: string }): EmailContent => ({
  subject: n.title, preheader: "Ke një njoftim të ri në llogarinë tënde.", icon: n.icon ?? "★",
  title: n.title, subtitle: "Ke një njoftim të ri në llogarinë tënde.",
  body: [n.body ?? "Hyr në llogarinë tënde për të parë hollësitë."],
  cta: { label: n.cta ?? "Shiko njoftimin", url: n.url },
  note: "Mund t'i ndryshosh preferencat e njoftimeve te Siguria në llogarinë tënde.",
});

/** Icons and wording for in-app notices that also email. Unlisted kinds use the generic notice. */
export const NOTICE_STYLE: Record<string, { icon: string; body?: string; cta?: string }> = {
  ID_APPROVED: { icon: "✓", body: "Verifikimi i identitetit tënd u miratua. Tani mund të përdorësh plotësisht llogarinë tënde.", cta: "Hap llogarinë" },
  ID_DECLINED: { icon: "!", body: "Verifikimi i identitetit tënd nuk u miratua. Hyr në llogari për të parë arsyen dhe për ta provuar përsëri.", cta: "Shiko hollësitë" },
};
