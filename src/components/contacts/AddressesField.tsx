"use client";

import { useRef, useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { MAX_ADDRESSES } from "@/lib/contacts/schema";
import { ADDRESS_TYPES, type AddressInput, type AddressType } from "@/lib/contacts/types";

/** One row being edited; `key` is client-only so React can track removals. */
type Row = AddressInput & { key: number };

/** Explicit pick down to the write shape, dropping `id`/`key` extras. */
export function toAddressInput(address: AddressInput): AddressInput {
  return {
    type: address.type,
    street: address.street,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
    country: address.country,
  };
}

const EMPTY_ADDRESS: AddressInput = {
  type: "Home",
  street: null,
  city: null,
  state: null,
  postal_code: null,
  country: null,
};

const PART_SPECS = [
  { name: "street", label: "Street", max: 300, span: "sm:col-span-2" },
  { name: "city", label: "City", max: 120, span: "" },
  { name: "state", label: "State", max: 120, span: "" },
  { name: "postal_code", label: "Postal code", max: 20, span: "" },
  { name: "country", label: "Country", max: 120, span: "" },
] as const;

const inputClasses =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm " +
  "text-foreground placeholder:text-muted-foreground/60 focus:outline-none " +
  "focus:ring-2 focus:ring-ring";

/**
 * Repeating editor for a contact's postal addresses. The rows are serialized
 * as JSON into one hidden `addresses` input, because FormData has no native
 * shape for a list of structured records — `contactInputSchema` parses and
 * validates the JSON on the server side of the action.
 */
export default function AddressesField({
  defaultValue,
  error,
}: {
  defaultValue: AddressInput[];
  error?: string;
}) {
  // Seed rows keyed by index; the ref only advances inside event handlers.
  const nextKey = useRef(defaultValue.length);
  const [rows, setRows] = useState<Row[]>(() =>
    defaultValue.map((address, index) => ({ ...address, key: index })),
  );

  function addRow() {
    setRows((current) => [
      ...current,
      { ...EMPTY_ADDRESS, key: nextKey.current++ },
    ]);
  }

  function removeRow(key: number) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  function patchRow(key: number, patch: Partial<AddressInput>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  const payload = JSON.stringify(rows.map(toAddressInput));

  return (
    <div className="space-y-4">
      <input type="hidden" name="addresses" value={payload} />

      {rows.length === 0 ? (
        <p className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-[13px] text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          No addresses yet.
        </p>
      ) : null}

      {rows.map((row, index) => (
        <fieldset
          key={row.key}
          className="space-y-3 rounded-lg border border-border bg-card/50 p-4"
        >
          <legend className="sr-only">Address {index + 1}</legend>

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-[13px] font-medium text-foreground">
              Type
              <select
                value={row.type}
                onChange={(event) =>
                  patchRow(row.key, { type: event.target.value as AddressType })
                }
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ADDRESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeRow(row.key)}
              aria-label={`Remove address ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Remove
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {PART_SPECS.map((part) => (
              <label key={part.name} className={`block ${part.span}`}>
                <span className="mb-1 block text-[13px] text-muted-foreground">
                  {part.label}
                </span>
                <input
                  type="text"
                  value={row[part.name] ?? ""}
                  maxLength={part.max}
                  onChange={(event) =>
                    patchRow(row.key, { [part.name]: event.target.value })
                  }
                  className={inputClasses}
                />
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {error ? (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={addRow}
        disabled={rows.length >= MAX_ADDRESSES}
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        Add address
      </Button>
    </div>
  );
}
