const RANDOM_ALPHABET = "abcdefghijkmnopqrstuvwxyz0123456789";

export function toKebabCase(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .trim();
}

export function randomString(length: number) {
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values)
    .map((value) => RANDOM_ALPHABET[value % RANDOM_ALPHABET.length])
    .join("");
}

export function normalizeEmail(email: string) {
  const cleaned = email.trim().toLowerCase();
  if (!cleaned) return "";
  const basicEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return basicEmail.test(cleaned) ? cleaned : "";
}

export function buildSlug(title: string) {
  return `pact-${randomString(8)}`;
}

export function computeExpiresAt(days: number) {
  const now = new Date();
  const expires = new Date(now.getTime());
  expires.setDate(expires.getDate() + days);
  return expires;
}

export function formatDate(value: Date) {
  return value.toLocaleString();
}
