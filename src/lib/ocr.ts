import { createWorker } from "tesseract.js";
import tesseractPackage from "tesseract.js/package.json";

// Built sites serve the OCR engine and French data themselves (see scripts/release.mjs),
// so reading an image needs no third-party server and works offline once used.
function localOcrPaths() {
  if (import.meta.env.DEV) return {};
  const base = new URL(`${import.meta.env.BASE_URL}ocr/${tesseractPackage.version}/`, window.location.href).href;
  return { workerPath: base + "worker.min.js", corePath: base, langPath: base, workerBlobURL: false };
}

export async function extractTextFromImage(file: File, onProgress?: (value:number)=>void) {
  const worker = await createWorker("fra", 1, {
    ...localOcrPaths(),
    logger: message => {
      if (message.status === "recognizing text" && typeof message.progress === "number") onProgress?.(message.progress);
    }
  });
  try {
    const result = await worker.recognize(file);
    return result.data.text.trim();
  } finally {
    await worker.terminate();
  }
}
