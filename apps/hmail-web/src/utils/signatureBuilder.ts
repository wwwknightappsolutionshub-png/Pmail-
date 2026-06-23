export type SignatureFieldValues = {
  fullName: string;
  position: string;
  email: string;
  phone: string;
  linkedin: string;
  twitter: string;
  facebook: string;
  instagram: string;
};

export const emptySignatureFields = (): SignatureFieldValues => ({
  fullName: "",
  position: "",
  email: "",
  phone: "",
  linkedin: "",
  twitter: "",
  facebook: "",
  instagram: "",
});

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|bmp|svg|heic|heif)$/i;

function socialIconLink(label: string, url: string, glyph: string): string {
  const href = url.trim();
  if (!href) return "";
  const safeHref = href.startsWith("http") ? href : `https://${href}`;
  return `<a href="${safeHref}" style="display:inline-block;margin-right:6px;text-decoration:none;" title="${label}">${glyph}</a>`;
}

export function buildSignatureHtml(fields: SignatureFieldValues): string {
  const parts = [fields.fullName.trim(), fields.position.trim()].filter(Boolean);
  const lineOne = parts.join(" | ");
  const contactParts = [fields.email.trim(), fields.phone.trim()].filter(Boolean);
  const lineTwo = contactParts.join(" | ");

  const social = [
    socialIconLink("LinkedIn", fields.linkedin, "in"),
    socialIconLink("X", fields.twitter, "X"),
    socialIconLink("Facebook", fields.facebook, "f"),
    socialIconLink("Instagram", fields.instagram, "IG"),
  ]
    .filter(Boolean)
    .join("");

  const lines = [lineOne, lineTwo, social].filter(Boolean);
  return lines.join("<br>");
}

export function buildSignaturePlainText(fields: SignatureFieldValues): string {
  const parts = [fields.fullName.trim(), fields.position.trim(), fields.email.trim(), fields.phone.trim()].filter(
    Boolean,
  );
  const socialCount = [fields.linkedin, fields.twitter, fields.facebook, fields.instagram].filter((v) => v.trim()).length;
  if (socialCount > 0) parts.push(`${socialCount} social link${socialCount === 1 ? "" : "s"}`);
  return parts.join(" | ");
}

export function parseSignatureBody(body: string): SignatureFieldValues {
  const fields = emptySignatureFields();
  const text = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return fields;

  const segments = text.split("|").map((part) => part.trim());
  if (segments[0]) fields.fullName = segments[0];
  if (segments[1]) fields.position = segments[1];
  if (segments[2]) fields.email = segments[2];
  if (segments[3]) fields.phone = segments[3];
  return fields;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read image file."));
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode image."));
    image.src = src;
  });
}

async function compressImageDataUrl(dataUrl: string, maxBytes: number): Promise<string> {
  const image = await loadImage(dataUrl);
  const maxSide = 256;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image.");
  ctx.drawImage(image, 0, 0, width, height);

  let quality = 0.92;
  let output = canvas.toDataURL("image/jpeg", quality);
  while (output.length > maxBytes * 1.37 && quality > 0.45) {
    quality -= 0.08;
    output = canvas.toDataURL("image/jpeg", quality);
  }
  if (output.length > maxBytes * 1.37) {
    throw new Error("Image is too large. Try a smaller photo.");
  }
  return output;
}

export function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return IMAGE_EXTENSIONS.test(file.name);
}

export async function readSignatureAvatarFile(file: File, maxBytes = 400_000): Promise<string> {
  if (!isLikelyImageFile(file)) {
    throw new Error("Please choose a JPG, PNG, GIF, or WebP image.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Image must be 8 MB or smaller.");
  }

  const dataUrl = await readFileAsDataUrl(file);
  if (dataUrl.length <= maxBytes * 1.37) return dataUrl;
  return compressImageDataUrl(dataUrl, maxBytes);
}

export type ComposeSignatureSettings = {
  activeSignatureId: string | null;
  signatures: Array<{ id: string; body: string }>;
};

/** Returns true when the user has a non-empty active email signature. */
export function hasActiveEmailSignature(settings: ComposeSignatureSettings): boolean {
  if (!settings.signatures.length) return false;
  const activeId = settings.activeSignatureId ?? settings.signatures[0]?.id ?? null;
  if (!activeId) return false;
  const active = settings.signatures.find((signature) => signature.id === activeId);
  return Boolean(active?.body?.trim());
}
