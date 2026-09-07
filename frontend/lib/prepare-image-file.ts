/**
 * Normalize a product photo before upload.
 * iPhones often send HEIC or a file without a MIME type; we convert to JPEG.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 1600;

function isBrowserImageType(type: string): boolean {
  return type === "image/jpeg" || type === "image/png" || type === "image/webp";
}

function looksHeic(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const name = file.name || "";
  return (
    type.includes("heic") ||
    type.includes("heif") ||
    /\.hei[cf]$/i.test(name)
  );
}

async function canvasToJpeg(file: File, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    let width = bitmap.width;
    let height = bitmap.height;
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height, 1));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("canvas");
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error("blob")),
        "image/jpeg",
        quality
      );
    });
    return blob;
  } finally {
    bitmap.close();
  }
}

export async function prepareProductImageFile(file: File): Promise<File> {
  const type = (file.type || "").toLowerCase();
  if (
    isBrowserImageType(type) &&
    file.size <= MAX_BYTES &&
    !looksHeic(file)
  ) {
    return file;
  }

  try {
    let blob = await canvasToJpeg(file, 0.85);
    if (blob.size > MAX_BYTES) {
      blob = await canvasToJpeg(file, 0.7);
    }
    if (blob.size > MAX_BYTES) {
      throw new Error("too-large");
    }
    const stem = (file.name || "photo").replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${stem}.jpg`, { type: "image/jpeg" });
  } catch {
    if (isBrowserImageType(type) && file.size <= MAX_BYTES) {
      return file;
    }
    throw new Error(
      "Cette photo n’est pas lisible. Utilisez un JPEG, PNG ou WebP de moins de 5 Mo (pas HEIC)."
    );
  }
}

const MAX_PROOF_BYTES = 8 * 1024 * 1024;

/** Gallery photo or PDF for payment proofs. */
export async function prepareProofFile(file: File): Promise<File> {
  const type = (file.type || "").toLowerCase();
  const name = file.name || "";
  if (type === "application/pdf" || /\.pdf$/i.test(name)) {
    if (file.size > MAX_PROOF_BYTES) {
      throw new Error("Fichier trop volumineux (max 8 Mo).");
    }
    return file;
  }
  return prepareProductImageFile(file);
}
