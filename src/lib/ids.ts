/** Small ID helpers shared by the lib layer. */

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

/** Guest-facing booking reference, e.g. "CP-7K2Q9A". */
export function newReference(): string {
  let s = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const b of bytes) s += REF_ALPHABET[b % REF_ALPHABET.length];
  return `CP-${s}`;
}

/** Internal id with a readable prefix. */
export function newId(prefix: string): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  const rand = Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("");
  return `${prefix}_${Date.now().toString(36)}${rand}`.slice(0, 40);
}
