import type { Address, Contact } from "./types";

/**
 * Build an RFC 6350-compatible vCard (version 3.0 for maximum importer
 * support) from a contact. The photo is deliberately left out: base64 images
 * blow far past what a scannable QR code can carry (~3 KB), and every phone
 * fetches its own avatar UI anyway.
 */

/** Escape a text value per the vCard spec: backslash, comma, semicolon, newline. */
function esc(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Fold a content line at 75 octets per RFC 2426 §2.6: continuations begin
 * with a single space and may carry 74 octets. Counted in UTF-8 octets, not
 * characters, so multi-byte content cannot overflow the limit.
 */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const folded: string[] = [];
  let current = "";
  let octets = 0;
  let limit = 75;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (octets + size > limit) {
      folded.push(current);
      current = " ";
      octets = 1;
      limit = 75;
    }
    current += char;
    octets += size;
  }
  folded.push(current);
  return folded.join("\r\n");
}

const ADR_TYPE: Record<Address["type"], string> = {
  Home: "HOME",
  Work: "WORK",
  Other: "POSTAL",
};

function adrLine(address: Address): string {
  // ADR fields: PO box; extended; street; locality; region; postal code; country
  const parts = [
    "",
    "",
    address.street ?? "",
    address.city ?? "",
    address.state ?? "",
    address.postal_code ?? "",
    address.country ?? "",
  ];
  return `ADR;TYPE=${ADR_TYPE[address.type]}:${parts.map(esc).join(";")}`;
}

export function buildVCard(contact: Contact): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(contact.last_name)};${esc(contact.first_name)};;;`,
    `FN:${esc(contact.full_name)}`,
    `EMAIL;TYPE=INTERNET:${esc(contact.email)}`,
  ];

  if (contact.phone) lines.push(`TEL;TYPE=CELL:${esc(contact.phone)}`);
  if (contact.company) lines.push(`ORG:${esc(contact.company)}`);
  if (contact.job_title) lines.push(`TITLE:${esc(contact.job_title)}`);
  for (const address of contact.addresses) lines.push(adrLine(address));
  if (contact.notes) lines.push(`NOTE:${esc(contact.notes)}`);

  lines.push("END:VCARD");
  return lines.map(fold).join("\r\n");
}

/** Data URL for a download link — no client JS needed to save the .vcf. */
export function vCardDataUrl(contact: Contact): string {
  return `data:text/vcard;charset=utf-8,${encodeURIComponent(buildVCard(contact))}`;
}
