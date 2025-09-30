const SVG_NS = "http://www.w3.org/2000/svg";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

export async function captureElementToImage(
  el: HTMLElement,
  pixelRatio: number,
): Promise<HTMLImageElement> {
  const rect = el.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const pr = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  const targetWidth = Math.max(1, Math.round(width * pr));
  const targetHeight = Math.max(1, Math.round(height * pr));

  if (shouldDebugCapture()) {
    console.info("[LampMotion] capture via html2canvas", {
      width,
      height,
      targetWidth,
      targetHeight,
    });
  }
  return captureWithHtml2Canvas(el, targetWidth, targetHeight, pr);
}

async function captureWithHtml2Canvas(
  el: HTMLElement,
  targetWidth: number,
  targetHeight: number,
  pixelRatio: number,
): Promise<HTMLImageElement> {
  const module = await import("html2canvas");
  const html2canvas = module.default ?? module;
  const canvas = await html2canvas(el, {
    backgroundColor: null,
    scale: pixelRatio,
    useCORS: true,
    scrollX: -window.scrollX,
    scrollY: -window.scrollY,
    logging: false,
    width: Math.ceil(targetWidth / pixelRatio),
    height: Math.ceil(targetHeight / pixelRatio),
  });
  let dataUrl: string;
  try {
    dataUrl = canvas.toDataURL("image/png");
  } catch (error) {
    if (shouldDebugCapture()) {
      console.warn("[LampMotion] html2canvas toDataURL failed", error);
    }
    throw error;
  }
  const image = await loadImage(dataUrl);
  adjustImageSize(image, targetWidth, targetHeight);
  if (shouldDebugCapture()) {
    console.info("[LampMotion] capture image ready", {
      src: image.src.slice(0, 64),
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
  }
  return image;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (event) => reject(event);
    img.src = src;
  });
}

function adjustImageSize(img: HTMLImageElement, width: number, height: number) {
  img.width = width;
  img.height = height;
}

function shouldDebugCapture(): boolean {
  return (
    typeof console !== "undefined" &&
    (typeof process === "undefined" || process.env?.NODE_ENV !== "production")
  );
}
