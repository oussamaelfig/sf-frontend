import { toString as qrToString } from "qrcode";
import { Download, QrCode } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { buildVCard, vCardDataUrl } from "@/lib/contacts/vcard";
import type { Contact } from "@/lib/contacts/types";

/**
 * Server component: renders the contact as a scannable vCard QR code plus a
 * dependency-free `.vcf` download link. The QR SVG is generated at render
 * time on the server, so the page ships no QR library to the browser.
 */
export default async function ShareContactCard({ contact }: { contact: Contact }) {
  const svg = await qrToString(buildVCard(contact), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
  });

  return (
    <section
      aria-labelledby="share-contact-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-center gap-2 border-b border-hairline pb-2">
        <QrCode className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
        <h2
          id="share-contact-heading"
          className="font-display text-sm font-semibold text-foreground"
        >
          Share contact
        </h2>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-6">
        <div
          role="img"
          aria-label={`QR code with ${contact.full_name}'s contact card`}
          // White quiet zone is required for scanners, independent of theme.
          className="h-36 w-36 shrink-0 overflow-hidden rounded-md bg-white p-1 [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />

        <div className="space-y-3">
          <p className="max-w-xs text-[13px] text-muted-foreground">
            Scan with a phone camera to add {contact.first_name} straight to
            its contacts, or download the vCard.
          </p>
          <a
            href={vCardDataUrl(contact)}
            download={`${contact.full_name.replace(/\s+/g, "-").toLowerCase()}.vcf`}
            className={buttonClasses("secondary", "sm")}
          >
            <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Download .vcf
          </a>
        </div>
      </div>
    </section>
  );
}
