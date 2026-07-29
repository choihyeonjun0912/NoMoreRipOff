/** Thrown when the image cannot be compressed under the size limit. */
export class ImageTooLargeError extends Error {
  constructor() {
    super("압축 후에도 이미지가 너무 큽니다.");
    this.name = "ImageTooLargeError";
  }
}

const MAX_LONG_EDGE = 1568;
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.4;
const QUALITY_STEP = 0.1;
const MAX_BLOB_BYTES = 3 * 1024 * 1024; // 3 MB

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap with EXIF orientation handling where supported
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Fallback: HTMLImageElement (modern browsers apply EXIF orientation
    // automatically when drawing to canvas)
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("이미지를 불러오지 못했습니다."));
      };
      img.src = url;
    });
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("이미지 변환에 실패했습니다.")),
      "image/jpeg",
      quality
    );
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("이미지 인코딩에 실패했습니다."));
    reader.readAsDataURL(blob);
  });
  // Strip the "data:image/jpeg;base64," prefix
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

/**
 * Resize the image to max 1568px long edge, encode as JPEG (quality 0.85,
 * stepping down to 0.4 until <= 3 MB), and return base64 without the
 * data-URI prefix.
 */
export async function compressImage(file: File): Promise<string> {
  const source = await loadBitmap(file);
  const width = source.width;
  const height = source.height;
  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(width, height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지 처리를 지원하지 않는 브라우저입니다.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();

  let quality = INITIAL_QUALITY;
  let blob = await toBlob(canvas, quality);
  while (blob.size > MAX_BLOB_BYTES && quality - QUALITY_STEP >= MIN_QUALITY) {
    quality = Math.round((quality - QUALITY_STEP) * 100) / 100;
    blob = await toBlob(canvas, quality);
  }

  // Even at minimum quality the image may still exceed the limit
  // (e.g. extremely dense scans) — fail loudly instead of sending an
  // oversized payload the server will reject.
  if (blob.size > MAX_BLOB_BYTES) {
    throw new ImageTooLargeError();
  }

  return blobToBase64(blob);
}
