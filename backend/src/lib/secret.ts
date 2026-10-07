import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { SecretKind } from "@prisma/client";
import { HttpError } from "./http";

/**
 * Typed passwords are compared after smoothing out what phone keyboards vary on, so a person
 * only has to get the words right: spaces, punctuation, short vowels/tatweel, the alef/hamza
 * forms (أ إ آ ا), ى/ي, ة/ه, Persian-keyboard ی/ک, Eastern digits, and Latin letter case.
 */
export function normalisePassword(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[ً-ٰٟـ]/g, "") // harakat, superscript alef, tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[ىی]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ک/g, "ك")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[\p{P}\p{S}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * What gets hashed and compared. bcrypt only reads 72 bytes and an Arabic sentence is longer,
 * so typed passwords go through SHA-256 first.
 */
function canonical(kind: SecretKind, secret: string): string {
  if (kind === "PIN") return secret.trim();
  return createHash("sha256").update(normalisePassword(secret)).digest("hex");
}

/** Checks the shape of a new secret and returns its hash. */
export async function hashSecret(kind: SecretKind, secret: string): Promise<string> {
  if (kind === "PIN" && !/^\d{4}$/.test(secret.trim())) throw new HttpError(400, "الرمز 4 أرقام");
  if (kind === "PASSWORD") {
    const n = normalisePassword(secret);
    if (n.replace(/\s/g, "").length < 4 || n.length > 200) throw new HttpError(400, "كلمة السر من 4 أحرف على الأقل");
  }
  return bcrypt.hash(canonical(kind, secret), 10);
}

export function checkSecret(kind: SecretKind, secret: string, hash: string): Promise<boolean> {
  return bcrypt.compare(canonical(kind, secret), hash);
}
