import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  kataSandi: string,
  salt: Buffer,
  panjangKunci: number,
) => Promise<Buffer>;

const PANJANG_SALT_BYTES = 16;
const PANJANG_KUNCI_BYTES = 64;

/**
 * Hash password dengan scrypt. Format tersimpan: `scrypt:<salt-hex>:<hash-hex>`
 * sehingga parameter dapat diverifikasi tanpa menyimpan password plaintext.
 */
export async function hashKataSandi(kataSandi: string): Promise<string> {
  const salt = randomBytes(PANJANG_SALT_BYTES);
  const turunan = await scryptAsync(kataSandi, salt, PANJANG_KUNCI_BYTES);

  return `scrypt:${salt.toString("hex")}:${turunan.toString("hex")}`;
}

export async function verifikasiKataSandi(
  kataSandi: string,
  hashTersimpan: string,
): Promise<boolean> {
  const [algoritma, saltHex, hashHex] = hashTersimpan.split(":");

  if (algoritma !== "scrypt" || !saltHex || !hashHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const hashBuffer = Buffer.from(hashHex, "hex");

  if (salt.length === 0 || hashBuffer.length === 0) {
    return false;
  }

  const turunan = await scryptAsync(kataSandi, salt, hashBuffer.length);

  return timingSafeEqual(turunan, hashBuffer);
}
