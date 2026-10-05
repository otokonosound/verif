import jsQR from "jsqr";

export async function decodeQrFromImage(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
  return result?.data || null;
}

export function decodeQrFromImageData(data: ImageData): string | null { const result = jsQR(data.data, data.width, data.height, { inversionAttempts: "attemptBoth" }); return result?.data || null; }
