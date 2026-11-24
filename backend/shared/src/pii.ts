const DIGIT_ZEROS = [0x0030, 0x0660, 0x06f0, 0x0966, 0x09e6, 0x0a66, 0x0ae6,
  0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0xff10]; // ASCII, Arabic, Devanagari, Bengali, Gurmukhi, Gujarati, ...

export function normalizeForPii(input: string): string {
  let out = "";
  for (const ch of input.normalize("NFKC")) {
    const cp = ch.codePointAt(0)!;
    const zero = DIGIT_ZEROS.find((z) => cp >= z && cp <= z + 9);
    out += zero === undefined ? ch : String(cp - zero);
  }
  return out;
}

const PATTERNS = [
  { kind: "phone", re: /\+?\d(?:[\s().\-]*\d){6,}/g },
  { kind: "email", re: /[\w.+-]+\s*(?:@|\(at\))\s*[\w-]+\s*(?:\.|\(dot\))\s*[a-z]{2,}/gi },
  { kind: "url",   re: /\b(?:https?:\/\/|www\.)\S+|\b[\w-]+\.(?:com|in|org|net|io|me)\b/gi },
  { kind: "handle",re: /(?:^|\s)@[\w.]{3,}/g },
] as const;

export function findPii(input: string) {
  const text = normalizeForPii(input).replace(
    /\b(zero|one|two|three|four|five|six|seven|eight|nine)\b/gi,
    (w) => String(["zero","one","two","three","four","five","six","seven","eight","nine"].indexOf(w.toLowerCase())));
  return PATTERNS.flatMap(({ kind, re }) =>
    [...text.matchAll(re)].map((m) => ({ kind, index: m.index ?? 0, text: m[0].trim() })));
}
export const containsPii = (s: string) => findPii(s).length > 0;