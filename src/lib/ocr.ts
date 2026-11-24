/*
 * Reads the text in screenshots or photos, on the phone (Tesseract). Free, and nothing leaves
 * the phone. The engine files are served from this site (public/ocr, copied at build time by
 * scripts/copy-ocr-assets.mjs) and only downloaded the first time screenshots are used.
 */
type Worker = Awaited<ReturnType<(typeof import('tesseract.js'))['createWorker']>>;

let workerPromise: Promise<Worker> | null = null;

function getWorker(onProgress?: (p: number) => void): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      return createWorker('eng', 1, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr/',
        langPath: '/ocr',
        gzip: true,
        logger: (m: { status: string; progress: number }) => {
          if (m.status?.includes('loading') && onProgress) onProgress(m.progress * 0.3);
        },
      });
    })().catch((e) => {
      workerPromise = null;
      throw e;
    });
  }
  return workerPromise;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't an image."));
    };
    img.src = url;
  });
}

/**
 * Grayscale, and invert dark-mode screenshots (light text on dark), which Tesseract reads badly.
 * Very small images are scaled up a little.
 */
function prepare(img: HTMLImageElement): HTMLCanvasElement {
  const scale = img.naturalWidth < 900 ? 2 : 1;
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth * scale;
  canvas.height = img.naturalHeight * scale;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = px.data;
  let total = 0;
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = y;
    total += y;
  }
  if (total / (d.length / 4) < 110) {
    for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = 255 - d[i];
  }
  ctx.putImageData(px, 0, 0);
  return canvas;
}

/** Text from one or more images, in order, as lines. */
export async function readImages(files: File[], onProgress?: (p: number) => void): Promise<string> {
  const worker = await getWorker(onProgress);
  const parts: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const canvas = prepare(await loadImage(files[i]));
    const { data } = await worker.recognize(canvas);
    parts.push(data.text);
    onProgress?.(0.3 + (0.7 * (i + 1)) / files.length);
  }
  return parts.join('\n');
}

/** A photo for a recipe: centre-cropped to 4:3 and shrunk, as a small JPEG data URL. */
export async function photoFromFile(file: File): Promise<string> {
  const img = await loadImage(file);
  const targetW = 720;
  const targetH = 540;
  const srcRatio = img.naturalWidth / img.naturalHeight;
  const dstRatio = targetW / targetH;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (srcRatio > dstRatio) sw = sh * dstRatio;
  else sh = sw / dstRatio;
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  canvas.getContext('2d')!.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, targetW, targetH);
  return canvas.toDataURL('image/jpeg', 0.72);
}
