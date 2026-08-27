"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
/** Raw file cap before resizing; the stored payload ends up far smaller. */
const MAX_FILE_BYTES = 5 * 1024 * 1024;
/** Longest edge after downscaling — an avatar never needs more than this. */
const MAX_EDGE_PX = 512;

/**
 * Downscale the chosen image on the client so the stored base64 payload stays
 * tiny (a 12 MP photo becomes a few tens of KB) and never trips the API's cap.
 */
async function fileToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable");
    context.drawImage(bitmap, 0, 0, width, height);

    // JPEG keeps avatars small; transparency is not worth 10x the bytes here.
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    bitmap.close();
  }
}

/**
 * Profile photo picker with a circular live preview. The resized data URL —
 * never the raw file — is submitted through a hidden `photo` input, so the
 * value also survives edit-form round trips (PUT replaces every field).
 */
export default function PhotoField({
  defaultValue,
  error,
}: {
  defaultValue?: string;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const message = localError ?? error;

  async function onFileChosen(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setLocalError("Choose an image under 5 MB.");
      return;
    }

    setBusy(true);
    setLocalError(null);
    try {
      setPhoto(await fileToDataUrl(file));
    } catch {
      setLocalError("That image could not be read. Try a different file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <input type="hidden" name="photo" value={photo} />
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        aria-label="Choose profile photo"
        className="sr-only"
        onChange={(event) => {
          void onFileChosen(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <div className="flex items-center gap-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- a data URL gains nothing from next/image
          <img
            src={photo}
            alt="Profile photo preview"
            className="aspect-square h-20 w-20 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground"
          >
            <ImagePlus className="h-6 w-6" strokeWidth={1.5} />
          </span>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {photo ? "Replace photo" : "Upload photo"}
          </Button>

          {photo ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPhoto("");
                setLocalError(null);
              }}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      {message ? (
        <p role="alert" className="mt-1.5 text-[13px] text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  );
}
