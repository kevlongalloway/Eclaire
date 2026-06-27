/** Short, sortable-ish, URL-safe ids with a type prefix (e.g. "prod_a1b2c3..."). */
export function newId(prefix: string): string {
  const uuid = crypto.randomUUID().replace(/-/g, "");
  return `${prefix}_${uuid.slice(0, 24)}`;
}

// No 0/O/1/I — avoids transcription mistakes when a customer reads this off
// an email or types it into the tracking form.
const CONFIRMATION_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A short customer-facing order number, e.g. "EC-7K2QXM9P" (~1e12 combinations). */
export function newConfirmationNumber(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let code = "";
  for (const b of bytes) code += CONFIRMATION_ALPHABET[b % CONFIRMATION_ALPHABET.length];
  return `EC-${code}`;
}

/** Slug from a product name, used as a fallback id and image key segment. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
