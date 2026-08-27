import { buildVCard, vCardDataUrl } from "@/lib/contacts/vcard";
import { makeContact } from "../../mocks/handlers";

describe("buildVCard", () => {
  it("produces a well-formed 3.0 card with the identity fields", () => {
    const lines = buildVCard(makeContact()).split("\r\n");

    expect(lines[0]).toBe("BEGIN:VCARD");
    expect(lines[1]).toBe("VERSION:3.0");
    expect(lines).toContain("N:Lovelace;Ada;;;");
    expect(lines).toContain("FN:Ada Lovelace");
    expect(lines).toContain("EMAIL;TYPE=INTERNET:ada@example.com");
    expect(lines).toContain("ORG:Analytical Engines");
    expect(lines.at(-1)).toBe("END:VCARD");
  });

  it("maps each typed address onto an ADR line", () => {
    const card = buildVCard(
      makeContact({
        addresses: [
          {
            id: 1,
            type: "Work",
            street: "1 Market St",
            city: "San Francisco",
            state: "CA",
            postal_code: "94105",
            country: "USA",
          },
          {
            id: 2,
            type: "Other",
            street: null,
            city: "Toronto",
            state: null,
            postal_code: null,
            country: "Canada",
          },
        ],
      }),
    );

    expect(card).toContain(
      "ADR;TYPE=WORK:;;1 Market St;San Francisco;CA;94105;USA",
    );
    expect(card).toContain("ADR;TYPE=POSTAL:;;;Toronto;;;Canada");
  });

  it("skips the optional fields that are empty", () => {
    const card = buildVCard(
      makeContact({ phone: null, company: null, job_title: null, addresses: [] }),
    );

    expect(card).not.toContain("TEL");
    expect(card).not.toContain("ORG");
    expect(card).not.toContain("TITLE");
    expect(card).not.toContain("ADR");
  });

  it("escapes the vCard special characters", () => {
    const card = buildVCard(
      makeContact({
        company: "Acme, Inc; West",
        notes: "line one\nline two",
      }),
    );

    expect(card).toContain("ORG:Acme\\, Inc\\; West");
    expect(card).toContain("NOTE:line one\\nline two");
  });

  it("folds long lines at 75 octets with space-led continuations", () => {
    const card = buildVCard(makeContact({ notes: "x".repeat(300) }));
    const physical = card.split("\r\n");

    const encoder = new TextEncoder();
    for (const line of physical) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }

    // Unfolding (strip CRLF + space) restores the logical line intact.
    const unfolded = card.replace(/\r\n /g, "");
    expect(unfolded).toContain(`NOTE:${"x".repeat(300)}`);
  });

  it("counts folding in octets so multi-byte text cannot overflow", () => {
    const card = buildVCard(makeContact({ notes: "é".repeat(100) }));
    const encoder = new TextEncoder();
    for (const line of card.split("\r\n")) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("never embeds the photo payload", () => {
    const card = buildVCard(
      makeContact({ photo: "data:image/png;base64,QUJD" }),
    );

    expect(card).not.toContain("PHOTO");
    expect(card).not.toContain("QUJD");
  });
});

describe("vCardDataUrl", () => {
  it("is a text/vcard data URL that decodes back to the card", () => {
    const contact = makeContact();
    const url = vCardDataUrl(contact);

    expect(url.startsWith("data:text/vcard;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(url.split(",").slice(1).join(","))).toBe(
      buildVCard(contact),
    );
  });
});
