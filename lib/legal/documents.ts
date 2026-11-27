import { msgKey } from "@/lib/i18n/translate";
import type { MessageKey } from "@/lib/i18n/messages/sq";

export type LegalSection = {
  id: string;
  title: MessageKey;
  paragraphs: MessageKey[];
  callout?: MessageKey;
};

export type LegalDocumentSpec = {
  title: MessageKey;
  effectiveDate: MessageKey;
  intro: MessageKey;
  toc: MessageKey;
  sections: LegalSection[];
};

export const termsDocument: LegalDocumentSpec = {
  title: msgKey("terms.title"),
  effectiveDate: msgKey("terms.effectiveDate"),
  intro: msgKey("terms.intro"),
  toc: msgKey("terms.toc"),
  sections: [
    { id: "operatori", title: msgKey("terms.operatorTitle"), paragraphs: [msgKey("terms.operatorBody")] },
    { id: "sherbimi", title: msgKey("terms.theServiceTitle"), paragraphs: [msgKey("terms.theServiceBody"), msgKey("terms.theServiceBody2")] },
    { id: "llogarite", title: msgKey("terms.eligibilityTitle"), paragraphs: [msgKey("terms.eligibilityBody")] },
    { id: "identiteti", title: msgKey("terms.identityTitle"), paragraphs: [msgKey("terms.identityBody"), msgKey("terms.identityBody2")] },
    { id: "punesimi", title: msgKey("terms.hiringTitle"), paragraphs: [msgKey("terms.hiringBody")] },
    { id: "rezervo-tani", title: msgKey("terms.bookNowTitle"), paragraphs: [msgKey("terms.bookNowBody")] },
    { id: "vleresimi", title: msgKey("terms.estimatesTitle"), paragraphs: [msgKey("terms.estimatesBody")] },
    { id: "perseritjet", title: msgKey("terms.recurringTitle"), paragraphs: [msgKey("terms.recurringBody"), msgKey("terms.recurringBody2")] },
    { id: "komisioni", title: msgKey("terms.feesTitle"), paragraphs: [msgKey("terms.feesBody")] },
    { id: "pagesat", title: msgKey("terms.paymentsTitle"), paragraphs: [msgKey("terms.paymentsBody")], callout: msgKey("terms.paymentsCallout") },
    { id: "anulimet", title: msgKey("terms.cancellationTitle"), paragraphs: [msgKey("terms.cancellationBody"), msgKey("terms.cancellationBody2")] },
    { id: "arrita", title: msgKey("terms.arrivalTitle"), paragraphs: [msgKey("terms.arrivalBody")] },
    { id: "sjellja", title: msgKey("terms.conductTitle"), paragraphs: [msgKey("terms.conductBody")] },
    { id: "vleresimet", title: msgKey("terms.reviewsTitle"), paragraphs: [msgKey("terms.reviewsBody")] },
    { id: "mbeshtetja", title: msgKey("terms.supportTitle"), paragraphs: [msgKey("terms.supportBody")] },
    { id: "pezullimi", title: msgKey("terms.suspensionTitle"), paragraphs: [msgKey("terms.suspensionBody")] },
    { id: "pergjegjesia", title: msgKey("terms.liabilityTitle"), paragraphs: [msgKey("terms.liabilityBody")] },
    { id: "ndryshimet", title: msgKey("terms.changesTitle"), paragraphs: [msgKey("terms.changesBody")] },
    { id: "ligji", title: msgKey("terms.lawTitle"), paragraphs: [msgKey("terms.lawBody")] },
    { id: "kontakti", title: msgKey("terms.contactTitle"), paragraphs: [msgKey("terms.contactBody")] },
  ],
};

export const privacyDocument: LegalDocumentSpec = {
  title: msgKey("privacy.title"),
  effectiveDate: msgKey("privacy.effectiveDate"),
  intro: msgKey("privacy.intro"),
  toc: msgKey("privacy.toc"),
  sections: [
    { id: "kush-jemi", title: msgKey("privacy.controllerTitle"), paragraphs: [msgKey("privacy.controllerBody")] },
    { id: "kuadri", title: msgKey("privacy.lawTitle"), paragraphs: [msgKey("privacy.lawBody")] },
    { id: "te-dhenat", title: msgKey("privacy.dataTitle"), paragraphs: [msgKey("privacy.dataBody"), msgKey("privacy.dataBody2")] },
    { id: "qellimet", title: msgKey("privacy.purposesTitle"), paragraphs: [msgKey("privacy.purposesBody")] },
    { id: "identiteti", title: msgKey("privacy.identityTitle"), paragraphs: [msgKey("privacy.identityBody"), msgKey("privacy.identityBody2")] },
    { id: "ndarja", title: msgKey("privacy.sharingTitle"), paragraphs: [msgKey("privacy.sharingBody")] },
    { id: "ruajtja", title: msgKey("privacy.retentionTitle"), paragraphs: [msgKey("privacy.retentionBody")] },
    { id: "cookies", title: msgKey("privacy.cookiesTitle"), paragraphs: [msgKey("privacy.cookiesBody")] },
    { id: "transferimi", title: msgKey("privacy.transfersTitle"), paragraphs: [msgKey("privacy.transfersBody")] },
    { id: "te-drejtat", title: msgKey("privacy.rightsTitle"), paragraphs: [msgKey("privacy.rightsBody")] },
    { id: "siguria", title: msgKey("privacy.securityTitle"), paragraphs: [msgKey("privacy.securityBody")] },
    { id: "te-miturit", title: msgKey("privacy.childrenTitle"), paragraphs: [msgKey("privacy.childrenBody")] },
    { id: "ndryshimet", title: msgKey("privacy.changesTitle"), paragraphs: [msgKey("privacy.changesBody")] },
    { id: "kontakti", title: msgKey("privacy.contactTitle"), paragraphs: [msgKey("privacy.contactBody")] },
  ],
};
