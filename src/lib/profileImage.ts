const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const OUTPUT_MIME = "image/jpeg";
const OUTPUT_QUALITY = 0.86;
const MAX_OUTPUT_DIMENSION = 1024;

export function validateProfileImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return "Podporované sú iba JPG, PNG alebo WEBP súbory.";
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return "Maximálna veľkosť fotky je 5 MB.";
  }

  return null;
}

export function validateProfileImageBlob(blob: Blob): string | null {
  if (blob.type && !ACCEPTED_IMAGE_TYPES.has(blob.type)) {
    return "Podporované sú iba JPG, PNG alebo WEBP súbory.";
  }

  if (blob.size > MAX_IMAGE_BYTES) {
    return "Maximálna veľkosť fotky je 5 MB.";
  }

  return null;
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
        return;
      }
      reject(new Error("Nepodarilo sa načítať obrázok"));
    });
    reader.addEventListener("error", () => reject(new Error("Nepodarilo sa načítať obrázok")));
    reader.readAsDataURL(file);
  });
}

async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Nepodarilo sa spracovať obrázok"));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function compressProfileImage(blob: Blob): Promise<Blob> {
  if (!blob.type.startsWith("image/")) {
    return blob;
  }

  const image = await loadImageFromBlob(blob);
  const maxSide = Math.max(image.width, image.height);
  const scale = maxSide > MAX_OUTPUT_DIMENSION ? MAX_OUTPUT_DIMENSION / maxSide : 1;

  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return blob;
  }

  context.drawImage(image, 0, 0, width, height);

  const compressed = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), OUTPUT_MIME, OUTPUT_QUALITY);
  });

  return compressed ?? blob;
}
