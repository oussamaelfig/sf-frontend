import {
  CONTACT_FIELDS,
  contactInputSchema,
  formDataToValues,
  safeParseAddresses,
  zodFieldErrors,
} from "@/lib/contacts/schema";

function values(overrides: Record<string, string> = {}) {
  return {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "Ada@Example.com",
    phone: "",
    company: "",
    job_title: "",
    addresses: "[]",
    notes: "",
    ...overrides,
  };
}

describe("contactInputSchema", () => {
  it("lowercases the email and nulls out the blanks", () => {
    const parsed = contactInputSchema.parse(values());

    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.phone).toBeNull();
    expect(parsed.notes).toBeNull();
  });

  it("trims what the user typed", () => {
    expect(contactInputSchema.parse(values({ company: "  Acme  " })).company).toBe(
      "Acme",
    );
  });

  it("requires the three fields the API requires", () => {
    const result = contactInputSchema.safeParse(
      values({ first_name: " ", last_name: "", email: "" }),
    );

    expect(result.success).toBe(false);
    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name is required",
      last_name: "Last name is required",
      email: "Email is required",
    });
  });

  it("rejects a malformed email", () => {
    const result = contactInputSchema.safeParse(values({ email: "not-an-email" }));
    expect(zodFieldErrors(result.error!).email).toBe("Enter a valid email address");
  });

  it("enforces the API's length limits", () => {
    const result = contactInputSchema.safeParse(
      values({ first_name: "a".repeat(101), phone: "9".repeat(41) }),
    );

    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name must be 100 characters or fewer",
      phone: "Phone must be 40 characters or fewer",
    });
  });

  it("parses the address rows out of their JSON envelope", () => {
    const parsed = contactInputSchema.parse(
      values({
        addresses: JSON.stringify([
          { type: "Work", street: " 1 Market St ", city: "SF", state: "", postal_code: "", country: "" },
        ]),
      }),
    );

    expect(parsed.addresses).toEqual([
      {
        type: "Work",
        street: "1 Market St",
        city: "SF",
        state: null,
        postal_code: null,
        country: null,
      },
    ]);
  });

  it("rejects an unknown address type and unreadable JSON", () => {
    const badType = contactInputSchema.safeParse(
      values({
        addresses: JSON.stringify([{ type: "Vacation" }]),
      }),
    );
    expect(badType.success).toBe(false);

    const badJson = contactInputSchema.safeParse(values({ addresses: "{oops" }));
    expect(zodFieldErrors(badJson.error!).addresses).toBe(
      "Addresses could not be read",
    );
  });

  it("caps the number of addresses like the API does", () => {
    const tooMany = contactInputSchema.safeParse(
      values({
        addresses: JSON.stringify(Array.from({ length: 11 }, () => ({ type: "Home" }))),
      }),
    );

    expect(zodFieldErrors(tooMany.error!).addresses).toBe(
      "A contact can have at most 10 addresses",
    );
  });
});

describe("safeParseAddresses", () => {
  it("returns the rows for a valid echo", () => {
    const rows = safeParseAddresses(
      JSON.stringify([{ type: "Home", city: "Toronto" }]),
    );
    expect(rows).toEqual([
      {
        type: "Home",
        street: null,
        city: "Toronto",
        state: null,
        postal_code: null,
        country: null,
      },
    ]);
  });

  it("returns null for non-array or malformed echoes instead of crashing", () => {
    // Parseable JSON that is not an address array — the shapes Qodo flagged.
    expect(safeParseAddresses("null")).toBeNull();
    expect(safeParseAddresses("{}")).toBeNull();
    expect(safeParseAddresses('[{"type":"Vacation"}]')).toBeNull();
    expect(safeParseAddresses("{oops")).toBeNull();
  });
});

describe("formDataToValues", () => {
  it("pulls every known field out, defaulting to an empty string", () => {
    const formData = new FormData();
    formData.set("first_name", "Grace");
    formData.set("email", "grace@example.com");
    formData.set("ignored", "nope");

    const extracted = formDataToValues(formData);

    expect(extracted.first_name).toBe("Grace");
    expect(extracted.last_name).toBe("");
    expect(Object.keys(extracted).sort()).toEqual(
      // `photo` and `addresses` submit through custom controls' hidden inputs,
      // so they are collected alongside the metadata-driven fields.
      [...CONTACT_FIELDS.map((field) => field.name), "photo", "addresses"].sort(),
    );
    expect(extracted.addresses).toBe("[]");
  });
});
