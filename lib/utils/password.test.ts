import { describe, expect, it } from "vitest";

import { hashKataSandi, verifikasiKataSandi } from "./password";

describe("hashKataSandi", () => {
  it("menghasilkan format scrypt dengan salt acak", async () => {
    const hash1 = await hashKataSandi("password123");
    const hash2 = await hashKataSandi("password123");

    expect(hash1).toMatch(/^scrypt:[0-9a-f]+:[0-9a-f]+$/);
    // Salt acak: hash dua password identik harus berbeda.
    expect(hash1).not.toBe(hash2);
  });
});

describe("verifikasiKataSandi", () => {
  it("menerima password yang benar", async () => {
    const hash = await hashKataSandi("password123");

    await expect(verifikasiKataSandi("password123", hash)).resolves.toBe(true);
  });

  it("menolak password yang salah", async () => {
    const hash = await hashKataSandi("password123");

    await expect(verifikasiKataSandi("password Salah", hash)).resolves.toBe(false);
  });

  it("menolak format hash yang tidak valid", async () => {
    await expect(verifikasiKataSandi("password123", "")).resolves.toBe(false);
    await expect(verifikasiKataSandi("password123", "md5:abc")).resolves.toBe(false);
    await expect(verifikasiKataSandi("password123", "scrypt:zz:zz")).resolves.toBe(false);
  });
});
