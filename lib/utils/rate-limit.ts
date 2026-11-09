// Rate limiter in-memory sederhana (fixed window per kunci).
// Catatan: state ini per-instance proses. Untuk deployment multi-instance
// (serverless/cluster), ganti implementasi penyimpanannya dengan Redis
// atau semacamnya tanpa mengubah kontrak fungsi.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAKS_BUCKET = 10_000;

export type HasilRateLimit = {
  diizinkan: boolean;
  sisaKuota: number;
  resetDetik: number;
};

export function ambilKunciKlien(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const ipPertama = forwarded.split(",")[0]?.trim();
    if (ipPertama) {
      return ipPertama;
    }
  }

  return "unknown";
}

export function cekRateLimit(
  kunci: string,
  batas: number,
  jendelaMs: number,
): HasilRateLimit {
  const sekarang = Date.now();

  // Evict bucket kedaluwarsa agar Map tidak tumbuh tanpa batas.
  if (buckets.size >= MAKS_BUCKET) {
    for (const [kunciLama, bucketLama] of buckets) {
      if (bucketLama.resetAt <= sekarang) {
        buckets.delete(kunciLama);
      }
    }
  }

  const bucket = buckets.get(kunci);

  if (!bucket || bucket.resetAt <= sekarang) {
    buckets.set(kunci, { count: 1, resetAt: sekarang + jendelaMs });
    return {
      diizinkan: true,
      sisaKuota: batas - 1,
      resetDetik: Math.ceil(jendelaMs / 1000),
    };
  }

  if (bucket.count >= batas) {
    return {
      diizinkan: false,
      sisaKuota: 0,
      resetDetik: Math.max(1, Math.ceil((bucket.resetAt - sekarang) / 1000)),
    };
  }

  bucket.count += 1;

  return {
    diizinkan: true,
    sisaKuota: batas - bucket.count,
    resetDetik: Math.max(1, Math.ceil((bucket.resetAt - sekarang) / 1000)),
  };
}
