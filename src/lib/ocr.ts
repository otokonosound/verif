import { createWorker } from "tesseract.js";

export async function extractTextFromImage(file: File, onProgress?: (value:number)=>void) {
  const worker = await createWorker("fra", 1, {
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
