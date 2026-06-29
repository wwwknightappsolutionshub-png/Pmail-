/** Gmail-style sender avatars — Gravatar photo with deterministic initials fallback. */

export function extractEmailFromHeader(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

export function senderLabel(from: string): string {
  const email = extractEmailFromHeader(from);
  const nameMatch = from.match(/^([^<]+)</);
  const name = nameMatch?.[1]?.trim().replace(/^["']|["']$/g, "");
  return name && name !== email ? name : email;
}

export function senderInitials(from: string): string {
  const label = senderLabel(from);
  const parts = label
    .replace(/@.+$/, "")
    .split(/[\s._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }
  const compact = label.replace(/@.+$/, "").trim();
  return (compact.slice(0, 2) || "?").toUpperCase();
}

const AVATAR_PALETTE: Array<{ background: string; color: string }> = [
  { background: "#1a73e8", color: "#ffffff" },
  { background: "#d93025", color: "#ffffff" },
  { background: "#f9ab00", color: "#202124" },
  { background: "#1e8e3e", color: "#ffffff" },
  { background: "#9334e6", color: "#ffffff" },
  { background: "#e8710a", color: "#ffffff" },
  { background: "#0d9488", color: "#ffffff" },
  { background: "#c5221f", color: "#ffffff" },
  { background: "#1967d2", color: "#ffffff" },
  { background: "#188038", color: "#ffffff" },
];

export function senderAvatarColors(email: string): { background: string; color: string } {
  let hash = 0;
  for (let index = 0; index < email.length; index += 1) {
    hash = email.charCodeAt(index) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]!;
}

function md5Hex(input: string): string {
  const utf8 = new TextEncoder().encode(input);

  function rotateLeft(value: number, shift: number): number {
    return (value << shift) | (value >>> (32 - shift));
  }

  function toWords(bytes: Uint8Array): number[] {
    const words: number[] = [];
    for (let index = 0; index < bytes.length; index += 1) {
      words[index >> 2] = words[index >> 2] ?? 0;
      words[index >> 2] |= bytes[index]! << ((index % 4) * 8);
    }
    const bitLength = bytes.length * 8;
    words[bitLength >> 5] = words[bitLength >> 5] ?? 0;
    words[bitLength >> 5] |= 0x80 << bitLength % 32;
    words[(((bitLength + 64) >>> 9) << 4) + 14] = bitLength;
    return words;
  }

  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return (b + rotateLeft((a + ((b & c) | (~b & d)) + x + t) | 0, s)) | 0;
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return (b + rotateLeft((a + ((b & d) | (c & ~d)) + x + t) | 0, s)) | 0;
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return (b + rotateLeft((a + (b ^ c ^ d) + x + t) | 0, s)) | 0;
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return (b + rotateLeft((a + (c ^ (b | ~d)) + x + t) | 0, s)) | 0;
  }

  const words = toWords(utf8);
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let index = 0; index < words.length; index += 16) {
    const chunk = words.slice(index, index + 16);
    while (chunk.length < 16) chunk.push(0);
    const [aa, bb, cc, dd] = [a, b, c, d];

    a = ff(a, b, c, d, chunk[0]!, 7, 0xd76aa478);
    d = ff(d, a, b, c, chunk[1]!, 12, 0xe8c7b756);
    c = ff(c, d, a, b, chunk[2]!, 17, 0x242070db);
    b = ff(b, c, d, a, chunk[3]!, 22, 0xc1bdceee);
    a = ff(a, b, c, d, chunk[4]!, 7, 0xf57c0faf);
    d = ff(d, a, b, c, chunk[5]!, 12, 0x4787c62a);
    c = ff(c, d, a, b, chunk[6]!, 17, 0xa8304613);
    b = ff(b, c, d, a, chunk[7]!, 22, 0xfd469501);
    a = ff(a, b, c, d, chunk[8]!, 7, 0x698098d8);
    d = ff(d, a, b, c, chunk[9]!, 12, 0x8b44f7af);
    c = ff(c, d, a, b, chunk[10]!, 17, 0xffff5bb1);
    b = ff(b, c, d, a, chunk[11]!, 22, 0x895cd7be);
    a = ff(a, b, c, d, chunk[12]!, 7, 0x6b901122);
    d = ff(d, a, b, c, chunk[13]!, 12, 0xfd987193);
    c = ff(c, d, a, b, chunk[14]!, 17, 0xa679438e);
    b = ff(b, c, d, a, chunk[15]!, 22, 0x49b40821);

    a = gg(a, b, c, d, chunk[1]!, 5, 0xf61e2562);
    d = gg(d, a, b, c, chunk[6]!, 9, 0xc040b340);
    c = gg(c, d, a, b, chunk[11]!, 14, 0x265e5a51);
    b = gg(b, c, d, a, chunk[0]!, 20, 0xe9b6c7aa);
    a = gg(a, b, c, d, chunk[5]!, 5, 0xd62f105d);
    d = gg(d, a, b, c, chunk[10]!, 9, 0x02441453);
    c = gg(c, d, a, b, chunk[15]!, 14, 0xd8a1e681);
    b = gg(b, c, d, a, chunk[4]!, 20, 0xe7d3fbc8);
    a = gg(a, b, c, d, chunk[9]!, 5, 0x21e1cde6);
    d = gg(d, a, b, c, chunk[14]!, 9, 0xc33707d6);
    c = gg(c, d, a, b, chunk[3]!, 14, 0xf4d50d87);
    b = gg(b, c, d, a, chunk[8]!, 20, 0x455a14ed);
    a = gg(a, b, c, d, chunk[13]!, 5, 0xa9e3e905);
    d = gg(d, a, b, c, chunk[2]!, 9, 0xfcefa3f8);
    c = gg(c, d, a, b, chunk[7]!, 14, 0x676f02d9);
    b = gg(b, c, d, a, chunk[12]!, 20, 0x8d2a4c8a);

    a = hh(a, b, c, d, chunk[5]!, 4, 0xfffa3942);
    d = hh(d, a, b, c, chunk[8]!, 11, 0x8771f681);
    c = hh(c, d, a, b, chunk[11]!, 16, 0x6d9d6122);
    b = hh(b, c, d, a, chunk[14]!, 23, 0xfde5380c);
    a = hh(a, b, c, d, chunk[1]!, 4, 0xa4beea44);
    d = hh(d, a, b, c, chunk[4]!, 11, 0x4bdecfa9);
    c = hh(c, d, a, b, chunk[7]!, 16, 0xf6bb4b60);
    b = hh(b, c, d, a, chunk[10]!, 23, 0xbebfbc70);
    a = hh(a, b, c, d, chunk[13]!, 4, 0x289b7ec6);
    d = hh(d, a, b, c, chunk[0]!, 11, 0xeaa127fa);
    c = hh(c, d, a, b, chunk[3]!, 16, 0xd4ef3085);
    b = hh(b, c, d, a, chunk[6]!, 23, 0x04881d05);
    a = hh(a, b, c, d, chunk[9]!, 4, 0xd9d4d039);
    d = hh(d, a, b, c, chunk[12]!, 11, 0xe6db99e5);
    c = hh(c, d, a, b, chunk[15]!, 16, 0x1fa27cf8);
    b = hh(b, c, d, a, chunk[2]!, 23, 0xc4ac5665);

    a = ii(a, b, c, d, chunk[0]!, 6, 0xf4292244);
    d = ii(d, a, b, c, chunk[7]!, 10, 0x432aff97);
    c = ii(c, d, a, b, chunk[14]!, 15, 0xab9423a7);
    b = ii(b, c, d, a, chunk[5]!, 21, 0xfc93a039);
    a = ii(a, b, c, d, chunk[12]!, 6, 0x655b59c3);
    d = ii(d, a, b, c, chunk[3]!, 10, 0x8f0ccc92);
    c = ii(c, d, a, b, chunk[10]!, 15, 0xffeff47d);
    b = ii(b, c, d, a, chunk[1]!, 21, 0x85845dd1);
    a = ii(a, b, c, d, chunk[8]!, 6, 0x6fa87e4f);
    d = ii(d, a, b, c, chunk[15]!, 10, 0xfe2ce6e0);
    c = ii(c, d, a, b, chunk[6]!, 15, 0xa3014314);
    b = ii(b, c, d, a, chunk[13]!, 21, 0x4e0811a1);
    a = ii(a, b, c, d, chunk[4]!, 6, 0xf7537e82);
    d = ii(d, a, b, c, chunk[11]!, 10, 0xbd3af235);
    c = ii(c, d, a, b, chunk[2]!, 15, 0x2ad7d2bb);
    b = ii(b, c, d, a, chunk[9]!, 21, 0xeb86d391);

    a = (a + aa) | 0;
    b = (b + bb) | 0;
    c = (c + cc) | 0;
    d = (d + dd) | 0;
  }

  const bytes = new Uint8Array(16);
  const state = [a, b, c, d];
  for (let index = 0; index < state.length; index += 1) {
    bytes[index * 4] = state[index]! & 0xff;
    bytes[index * 4 + 1] = (state[index]! >> 8) & 0xff;
    bytes[index * 4 + 2] = (state[index]! >> 16) & 0xff;
    bytes[index * 4 + 3] = (state[index]! >> 24) & 0xff;
  }

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function gravatarUrlForEmail(email: string, size = 80): string {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return "";
  const hash = md5Hex(normalized);
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
}
